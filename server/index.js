import express from "express";
import cors from "cors";
import { google } from "googleapis";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, "users.json");
const CODES_FILE = path.join(__dirname, "verification_codes.json");

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Helper to read/write codes
const getCodes = () => {
    if (!fs.existsSync(CODES_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(CODES_FILE, "utf-8"));
    } catch {
        return {};
    }
};

const saveCodes = (codes) => {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
};

// Password Validation
const isPasswordValid = (password) => {
    const regex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    return regex.test(password);
};

// Helper to read/write users
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch {
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

async function listExcelFiles(folderId) {
    const q = `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='text/csv')`;
    const res = await drive.files.list({ q, fields: "files(id,name,modifiedTime)", pageSize: 1000 });
    return res.data.files || [];
}

async function listSubfolders(folderId) {
    const q = `'${folderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`;
    const res = await drive.files.list({ q, fields: "files(id,name)", pageSize: 1000 });
    return res.data.files || [];
}

async function listExcelFilesRecursive(folderId, depth = 0, allFiles = []) {
    const files = await listExcelFiles(folderId);
    allFiles.push(...files);
    const subfolders = await listSubfolders(folderId);
    for (const folder of subfolders) {
        await listExcelFilesRecursive(folder.id, depth + 1, allFiles);
    }
    return allFiles;
}

async function downloadFile(fileId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
            return Buffer.from(res.data);
        } catch (error) {
            if ((error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.status >= 500) && i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                continue;
            }
            throw error;
        }
    }
}

function parseExcelContent(buffer, fileName) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (fileName && fileName.toLowerCase().includes("product movement")) {
        const validSheets = [];
        for (const sheetName of workbook.SheetNames) {
            if (!sheetName.toLowerCase().includes("overall")) continue;
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
            let isValid = false;
            const checkLimit = Math.min(rows.length, 15);
            for (let i = 0; i < checkLimit; i++) {
                const rowStr = JSON.stringify(rows[i] || []).toUpperCase();
                if (rowStr.includes("TARGET") && rowStr.includes("ACHIEVED")) {
                    isValid = true;
                    break;
                }
            }
            if (isValid) validSheets.push({ sheetName, data: rows });
        }
        return { isProductMovement: true, sheets: validSheets };
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: true });
    return { isProductMovement: false, rows };
}

// --- AUTH ENDPOINTS ---

app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Name, email and password are required" });
    if (!isPasswordValid(password)) return res.status(400).json({ error: "Password must be at least 6 characters and contain at least one special character." });
    const users = getUsers();
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists with this email." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codes = getCodes();
    codes[email] = { code, type: 'signup', data: { name, password }, expires: Date.now() + 10 * 60 * 1000 };
    saveCodes(codes);

    const mailOptions = {
        from: '"Impact.ai Auth" <no-reply@impact.ai>',
        to: email,
        subject: 'Verification Code - Impact.ai',
        html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Verify your email</h2><p>Code: <strong>${code}</strong></p></div>`
    };

    console.log(`[AUTH] Verification code for ${email}: ${code}`);
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) await transporter.sendMail(mailOptions);
        res.json({ message: "Verification code sent" });
    } catch (err) {
        res.json({ message: "Verification code sent (Dev mode: check console)" });
    }
});

app.post("/api/auth/verify-signup", async (req, res) => {
    const { email, code } = req.body;
    const codes = getCodes();
    const record = codes[email];
    if (!record || record.type !== 'signup' || record.code !== code || record.expires < Date.now()) return res.status(400).json({ error: "Invalid or expired code" });

    const users = getUsers();
    const newUser = { id: Date.now(), email, ...record.data, verified: true, preferences: {} };
    users.push(newUser);
    saveUsers(users);
    delete codes[email];
    saveCodes(codes);
    res.json({ message: "Verified successfully", user: { email, name: newUser.name, preferences: {} } });
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    res.json({ message: "Login successful", user: { email: user.email, name: user.name, preferences: user.preferences || {} } });
});

app.post("/api/auth/forgot-password-request", async (req, res) => {
    const { email } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codes = getCodes();
    codes[email] = { code, type: 'reset', expires: Date.now() + 10 * 60 * 1000 };
    saveCodes(codes);

    console.log(`[AUTH] Reset code for ${email}: ${code}`);
    try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) await transporter.sendMail({ from: '"Impact.ai Auth"', to: email, subject: 'Reset Code', text: `Code: ${code}` });
        res.json({ message: "Code sent" });
    } catch (err) {
        res.json({ message: "Code sent (Dev mode)" });
    }
});

app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!isPasswordValid(newPassword)) return res.status(400).json({ error: "Invalid password" });
    const codes = getCodes();
    const record = codes[email];
    if (!record || record.type !== 'reset' || record.code !== code || record.expires < Date.now()) return res.status(400).json({ error: "Invalid code" });

    const users = getUsers();
    const index = users.findIndex(u => u.email === email);
    if (index === -1) return res.status(404).json({ error: "User not found" });

    users[index].password = newPassword;
    saveUsers(users);
    delete codes[email];
    saveCodes(codes);
    res.json({ message: "Password updated" });
});

app.post("/api/auth/preferences", async (req, res) => {
    const { email, preferences } = req.body;
    const users = getUsers();
    const index = users.findIndex(u => u.email === email);
    if (index === -1) return res.status(404).json({ error: "User not found" });
    users[index].preferences = preferences;
    saveUsers(users);
    res.json({ message: "Preferences saved" });
});

// Drive API
app.post("/api/drive/folder", async (req, res) => {
    try {
        const { folderId } = req.body;
        const files = await listExcelFilesRecursive(folderId);
        let merged = [];
        let productMovementSheets = [];

        for (const f of files) {
            const buf = await downloadFile(f.id);
            const result = parseExcelContent(buf, f.name);
            if (result.isProductMovement) {
                result.sheets.forEach(s => productMovementSheets.push({ fileName: f.name, sheetName: s.sheetName, data: s.data, modifiedTime: f.modifiedTime }));
            } else {
                result.rows.forEach(r => { r.__sourceFile = f.name; r.__modifiedTime = f.modifiedTime; });
                merged = merged.concat(result.rows);
            }
        }
        res.json({ folderId, data: merged, productMovementSheets });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const server = app.listen(5001, () => { console.log("✅ Backend running at http://localhost:5001"); });
server.timeout = 600000;
