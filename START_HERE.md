# 🚀 START HERE - Complete Setup Guide

## ⚠️ IMPORTANT: Read This First!

If you're seeing login errors like:
```
TypeError: Cannot read properties of undefined (reading 'userType')
```

**This means your database is empty or the user doesn't exist!**

## 🎯 Quick Fix (3 Steps)

### Step 1: Check Database Status
```bash
npm run check
```

This will show you:
- How many users exist
- How many products exist
- What credentials to use

### Step 2: Seed Database (If Empty)
```bash
npm run seed
```

This creates:
- ✅ Buyer account: `buyer@example.com` / `password123`
- ✅ Seller account: `seller@example.com` / `password123`
- ✅ 4 categories
- ✅ 8 sample products

### Step 3: Start Server
```bash
npm run dev
```

## 🔐 Test Login

After seeding, you can login with:

**Buyer Account:**
- Email: `buyer@example.com`
- Password: `password123`

**Seller Account:**
- Email: `seller@example.com`
- Password: `password123`

## 🐛 Still Getting Errors?

### Error: "Cannot read properties of undefined (reading 'userType')"

**Cause**: The frontend is trying to access `response.data.userType` but the response is undefined.

**Solutions**:

1. **Check if you're using the correct credentials**
   ```bash
   npm run check
   ```
   This shows all existing users.

2. **Make sure the backend is running**
   ```bash
   npm run dev
   ```
   Should show: `🚀 Server running on http://localhost:5001`

3. **Check backend logs**
   Look for lines like:
   ```
   [LOGIN ATTEMPT] Username: buyer@example.com, UserType: buyer
   [LOGIN FAILED] User not found: buyer@example.com
   ```
   or
   ```
   [LOGIN FAILED] Invalid password for user: buyer@example.com
   ```

4. **Verify MongoDB is running**
   ```bash
   # Windows
   net start MongoDB
   
   # Mac
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

5. **Re-seed the database**
   ```bash
   npm run seed
   ```

### Error: "401 Unauthorized"

This means:
- ❌ User doesn't exist in database
- ❌ Wrong password
- ❌ Wrong email/username

**Solution**: Use the sample credentials after running `npm run seed`

### Error: "500 Internal Server Error"

This means:
- ❌ MongoDB is not running
- ❌ Database connection failed
- ❌ Server error

**Solution**:
1. Check MongoDB is running
2. Check `.env` file has correct `MONGODB_URI`
3. Check server logs for detailed error

## 📋 Complete Restart Checklist

Use this checklist every time you restart the project:

- [ ] MongoDB is running
- [ ] `.env` file exists
- [ ] Run `npm install` (if first time or dependencies changed)
- [ ] Run `npm run check` (verify database status)
- [ ] Run `npm run seed` (if database is empty)
- [ ] Run `npm run dev` (start server)
- [ ] Test login with sample credentials
- [ ] Check browser console for errors
- [ ] Check server logs for errors

## 🎓 Understanding the Error

The error `Cannot read properties of undefined (reading 'userType')` happens because:

1. Frontend makes login request
2. Backend returns 401 (user not found or wrong password)
3. Axios/Fetch throws an error
4. Frontend tries to access `response.data.userType`
5. But `response` is undefined in the error handler

**Backend Fix Applied**: All error responses now include:
```json
{
  "success": false,
  "message": "Error message",
  "data": {
    "user": null,
    "token": null,
    "userType": null
  }
}
```

**Frontend Should Check**: Always check `response.success` before accessing `response.data`

## 🔧 Advanced Troubleshooting

### Check What's in the Database

```bash
npm run check
```

Output example:
```
👥 Users: 2
   Existing users:
   - buyer@example.com (buyer1) - buyer
   - seller@example.com (seller1) - seller

📁 Categories: 4
📦 Products: 8

✅ DATABASE IS READY TO USE!
```

### View Server Logs

When you start the server with `npm run dev`, watch for:

```
[LOGIN ATTEMPT] Username: buyer@example.com, UserType: buyer
[LOGIN SUCCESS] User: buyer@example.com, Type: buyer
```

or

```
[LOGIN ATTEMPT] Username: wrong@email.com, UserType: buyer
[LOGIN FAILED] User not found: wrong@email.com
```

### Test API Directly

```bash
# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"buyer@example.com","password":"password123"}'

# Should return:
# {"success":true,"message":"Welcome back!","data":{...}}
```

### Reset Everything

If nothing works, reset everything:

```bash
# 1. Stop server (Ctrl+C)

# 2. Clear and reseed database
npm run seed

# 3. Restart server
npm run dev

# 4. Test with sample credentials
# Email: buyer@example.com
# Password: password123
```

## 📞 Need More Help?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions
2. Check [README.md](README.md) for API documentation
3. Run `npm run check` to see database status
4. Check server logs for detailed errors
5. Make sure you're using the correct credentials

## ✅ Success Indicators

You know everything is working when:

1. ✅ `npm run check` shows users in database
2. ✅ `npm run dev` starts without errors
3. ✅ Server logs show: `🚀 Server running on http://localhost:5001`
4. ✅ Login with `buyer@example.com` / `password123` works
5. ✅ No errors in browser console
6. ✅ No errors in server logs

## 🎉 You're All Set!

Once you see all success indicators, you can:
- Login with sample credentials
- Browse products
- Add items to cart
- Create orders
- Test all features

Happy coding! 🚀
