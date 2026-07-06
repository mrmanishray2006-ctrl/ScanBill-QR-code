# ScanBill-QR-code
Smart QR Billing and Store Management is a web/mobile app built for retail stores. It helps the owner manage products, generate QR codes, track stock, and manage monthly subscription access. It also lets customers scan product QR codes, build a bill automatically, and pay using UPI.

The main goal of this project is to make billing faster, reduce manual mistakes, and create a smooth shopping experience for both the owner and the customer.

Problem It Solves
In many small shops, billing is still done manually. This takes time, creates mistakes, and makes stock tracking difficult.

This project solves that by:

Giving each product a unique QR code.

Letting customers scan products directly.

Automatically adding scanned items to the bill.

Helping the owner manage products and stock in one place.

Making payment simple through UPI.

Main Features
Owner Side
Owner login and dashboard.

Add, edit, and delete products.

Auto-generate QR code for every product.

Download QR codes as PDF.

Manage product stock.

View product list and sales history.

Manage monthly subscription status.

Customer Side
User login.

QR code scanner.

Add scanned product to cart automatically.

Increase or decrease product quantity.

Remove items from cart.

View final bill before payment.

Pay using UPI.

Save receipt and order history.

How It Works
The owner logs in to the app.

The owner adds products with price, stock, and product details.

The system generates a QR code for each product.

The QR code can be downloaded or printed as a PDF.

The customer logs in and scans the product QR code.

The product is added to the cart automatically.

The customer reviews the bill.

The customer pays using UPI.

The app saves the order and updates the stock.

Tech Stack
This project can be built with:

Frontend: Flutter

Backend: Appwrite

Database: Appwrite Database

Storage: Appwrite Storage

Functions: Appwrite Functions

PDF Generation: Backend function or package

QR Code Generation: QR code library

Payment: UPI payment flow

Appwrite is a strong backend choice because it supports auth, databases, storage, functions, realtime, and hosting for sites.

Core Modules
Authentication
Handles owner and customer sign up, login, logout, and role-based access.

Product Management
Lets the owner add and manage products with details like:

Product name

Price

Stock quantity

Category

Description

Product image

QR Code System
Each product gets one unique QR code. Scanning the QR code opens the product and adds it to the cart.

Cart and Billing
The customer can manage cart items and see the final bill before payment.

Payment System
The customer can pay by UPI. After payment confirmation, the app creates the bill and saves the transaction.

Subscription Management
The owner account can have a monthly subscription. The app can restrict access if the subscription expires.

Database Structure
Users
Stores owner and customer account details.

Products
Stores product information and stock data.

QR Codes
Stores QR value and product mapping.

Carts
Stores active customer cart data.

Orders
Stores final bill and transaction history.

Payments
Stores payment status and transaction details.

Subscriptions
Stores owner plan and validity data.

