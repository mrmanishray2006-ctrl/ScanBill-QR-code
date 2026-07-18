import { Router, Response } from 'express';
import { PrismaClient, UserRole, AttendanceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticateJWT, requireRoles, requireEmployeePermission, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/security';

const router = Router();
const prisma = new PrismaClient();

// GET: /api/employees
// Fetch all employees mapped to this store
router.get('/', authenticateJWT, requireEmployeePermission('MANAGE_EMPLOYEES'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    const employees = await prisma.employee.findMany({
      where: { storeId, isDeleted: false },
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      }
    });
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve employee rosters.' });
  }
});

// POST: /api/employees
// Add and register a new Employee to this store
router.post('/', authenticateJWT, requireRoles([UserRole.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    const { name, email, password, role, permissions } = req.body; // role: MANAGER, CASHIER, STAFF

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required fields.' });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'A user account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await prisma.$transaction(async (tx) => {
      // Create user login account
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role as UserRole,
        }
      });

      // Create Employee mapping profile
      return await tx.employee.create({
        data: {
          userId: user.id,
          storeId: storeId!,
          role: role as UserRole,
          permissions: permissions || ['CASHIER_BILLING'],
        },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });
    });

    await logAuditEvent(req.user!.id, 'CREATE_EMPLOYEE', `Added employee ${name} as role ${role}`, req);

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register employee.' });
  }
});

// POST: /api/employees/:id/attendance
// Log shift Attendance check-in / check-out
router.post('/:id/attendance', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // Employee ID
    const { type } = req.body; // checkin, checkout

    const employee = await prisma.employee.findFirst({
      where: { id, isDeleted: false }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const todayStr = new Date().toDateString();
    
    if (type === 'checkin') {
      // Verify duplicate check-in
      const alreadyCheckedIn = await prisma.attendance.findFirst({
        where: {
          employeeId: id,
          date: {
            gte: new Date(new Date().setHours(0,0,0,0)),
            lte: new Date(new Date().setHours(23,59,59,999))
          }
        }
      });

      if (alreadyCheckedIn) {
        return res.status(400).json({ error: 'Employee has already clocked in for this shift.' });
      }

      const checkInLog = await prisma.attendance.create({
        data: {
          employeeId: id,
          status: AttendanceStatus.PRESENT,
          checkIn: new Date(),
        }
      });

      return res.status(201).json(checkInLog);
    } else if (type === 'checkout') {
      const activeAttendance = await prisma.attendance.findFirst({
        where: {
          employeeId: id,
          checkOut: null,
        },
        orderBy: { checkIn: 'desc' }
      });

      if (!activeAttendance) {
        return res.status(400).json({ error: 'No active clock-in log found for this employee.' });
      }

      const checkOutLog = await prisma.attendance.update({
        where: { id: activeAttendance.id },
        data: {
          checkOut: new Date(),
        }
      });

      return res.status(200).json(checkOutLog);
    }

    res.status(400).json({ error: 'Invalid attendance status parameter. Must be "checkin" or "checkout".' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record attendance timestamp.' });
  }
});

// GET: /api/employees/performance
// Fetch sales contributions
router.get('/performance', authenticateJWT, requireEmployeePermission('MANAGE_EMPLOYEES'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    
    // Group transaction values by employee checkout agents (orders logged under user roles)
    const employees = await prisma.employee.findMany({
      where: { storeId, isDeleted: false },
      include: { user: true }
    });

    const performanceRecords = [];

    for (const emp of employees) {
      // Find orders completed by this employee's email/user account
      const orders = await prisma.order.findMany({
        where: {
          storeId: storeId!,
          paymentStatus: 'PAID',
          customerEmail: { not: emp.user.email } // Filter customer self-shopping checkouts out
        }
      });

      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

      performanceRecords.push({
        employeeId: emp.id,
        name: emp.user.name,
        role: emp.role,
        transactionsCount: orders.length,
        totalSalesGenerated: totalRevenue
      });
    }

    res.status(200).json(performanceRecords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compile employees performance metrics.' });
  }
});

// DELETE: /api/employees/:id
router.delete('/:id', authenticateJWT, requireRoles([UserRole.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { id, storeId: req.user!.storeId, isDeleted: false }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    await prisma.$transaction([
      prisma.employee.update({ where: { id }, data: { isDeleted: true } }),
      prisma.user.update({ where: { id: employee.userId }, data: { isDeleted: true } })
    ]);

    await logAuditEvent(req.user!.id, 'DELETE_EMPLOYEE', `Removed employee ID: ${id}`, req);

    res.status(200).json({ message: 'Employee successfully deactivated.' });
  } catch (error) {
    res.status(500).json({ error: 'Deactivation failed.' });
  }
});
export default router;
