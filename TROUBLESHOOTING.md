# Troubleshooting Guide

## Common Issues and Solutions

### 1. Login Error: "Cannot read properties of undefined (reading 'userType')"

**Cause**: The frontend is trying to access `userType` from an undefined response object when login fails.

**Solution**: This has been fixed in the backend. All error responses now include a consistent `data` object with `userType: null`. 

**To apply the fix**:
1. Make sure you have the latest backend code
2. Restart your backend server
3. The error should no longer occur

**Prevention**: Always check `response.success` before accessing `response.data` in frontend code.

---

### 2. Products Endpoint Returns 500 Error

**Symptoms**:
```
GET /api/products/public 500 (Internal Server Error)
```

**Causes**:
- Empty database (no products)
- MongoDB connection issues
- Missing categories

**Solutions**:

**Option 1: Seed the database**
```bash
npm run seed
```

**Option 2: Check MongoDB connection**
```bash
# Check if MongoDB is running
# Windows:
net start MongoDB

# Mac/Linux:
sudo systemctl status mongod
```

**Option 3: Verify .env file**
```env
MONGODB_URI=mongodb://localhost:27017/tarkarishop
```

---

### 3. Login Returns 401 Unauthorized

**Symptoms**:
```
POST /api/auth/login 401 (Unauthorized)
```

**Causes**:
- No users in database
- Wrong credentials
- User account deactivated

**Solutions**:

**Option 1: Use sample credentials**
After running `npm run seed`, use:
- Buyer: `buyer@example.com` / `password123`
- Seller: `seller@example.com` / `password123`

**Option 2: Register a new user**
Use the registration endpoint first:
```bash
POST /api/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User",
  "phone": "9841234567",
  "address": "123 Test St",
  "city": "Kathmandu",
  "userType": "buyer"
}
```

---

### 4. MongoDB Connection Error

**Symptoms**:
```
❌ MongoDB connection error: MongoServerError: connect ECONNREFUSED
```

**Solutions**:

**For Local MongoDB**:
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**For MongoDB Atlas**:
1. Update `.env` with your Atlas connection string:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tarkarishop
```
2. Whitelist your IP address in Atlas
3. Check username and password

---

### 5. Tests Failing

**Symptoms**:
```
Test Suites: X failed, X total
```

**Solutions**:

**Option 1: Clear test cache**
```bash
npm test -- --clearCache
npm test
```

**Option 2: Reinstall dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

**Option 3: Check MongoDB**
Tests use in-memory MongoDB, but still need MongoDB drivers:
```bash
npm install mongodb-memory-server --save-dev
```

---

### 6. Port Already in Use

**Symptoms**:
```
❌ Port 5001 is already in use!
```

**Solutions**:

**Option 1: Kill the process**
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5001 | xargs kill -9
```

**Option 2: Change port**
Update `.env`:
```env
PORT=5002
```

---

### 7. JWT Token Invalid

**Symptoms**:
```
401 Unauthorized - Invalid token
```

**Solutions**:

**Option 1: Clear browser storage**
```javascript
localStorage.clear();
sessionStorage.clear();
```

**Option 2: Check JWT_SECRET**
Make sure `.env` has a valid JWT_SECRET:
```env
JWT_SECRET=your_long_secure_secret_key_here
```

**Option 3: Re-login**
Token might be expired (7 days validity). Login again to get a new token.

---

### 8. File Upload Errors

**Symptoms**:
```
Error uploading product images
```

**Solutions**:

**Option 1: Check uploads directory**
```bash
npm run setup
```

**Option 2: Verify permissions**
```bash
# Mac/Linux
chmod -R 755 public/uploads
```

**Option 3: Check file size**
Default limit is 5MB per file. Update in `middlewares/upload.js` if needed.

---

### 9. CORS Errors

**Symptoms**:
```
Access to fetch at 'http://localhost:5001' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solutions**:

**Option 1: Add your frontend URL**
Update `index.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    // Add your frontend URL here
  ],
  credentials: true
}));
```

**Option 2: Allow all origins (development only)**
```javascript
app.use(cors({
  origin: '*',
  credentials: true
}));
```

---

### 10. Validation Errors

**Symptoms**:
```
400 Bad Request - Validation failed
```

**Common Validation Rules**:

**User Registration (Buyer)**:
- username: 3-30 characters, alphanumeric + underscore
- email: valid email format
- password: minimum 6 characters
- firstName/lastName: 2-50 characters
- phone: valid phone format
- address: 10-200 characters
- city: 2-50 characters

**User Registration (Seller)**:
- All buyer fields except address
- farmName: 3-100 characters
- farmLocation: 5-200 characters

**Product Creation**:
- name: required
- price: positive number
- stock: positive integer
- category: valid category ID
- seller: authenticated seller

---

## Quick Restart Checklist

When restarting the project after a break:

- [ ] Start MongoDB
- [ ] Check `.env` file exists
- [ ] Run `npm install` (if dependencies changed)
- [ ] Run `npm run seed` (if database is empty)
- [ ] Run `npm run dev`
- [ ] Run `npm test` (verify everything works)
- [ ] Check server is running on http://localhost:5001

---

## Getting Help

If you're still experiencing issues:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Make sure all dependencies are installed
4. Try running `npm run setup` to reset configuration
5. Check the README.md for setup instructions
6. Create an issue in the repository with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, MongoDB version)

---

## Preventive Measures

To avoid issues in the future:

1. **Always seed the database** after clearing it:
   ```bash
   npm run seed
   ```

2. **Keep dependencies updated**:
   ```bash
   npm update
   ```

3. **Run tests regularly**:
   ```bash
   npm test
   ```

4. **Backup your .env file**:
   ```bash
   cp .env .env.backup
   ```

5. **Use version control**:
   ```bash
   git add .
   git commit -m "Working state"
   ```

6. **Document custom changes**:
   Keep notes of any configuration changes you make

---

## Emergency Reset

If everything is broken and you want to start fresh:

```bash
# 1. Stop the server (Ctrl+C)

# 2. Clear database
npm run seed

# 3. Reset configuration
npm run setup

# 4. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 5. Run tests
npm test

# 6. Start server
npm run dev
```

This should get you back to a working state!
