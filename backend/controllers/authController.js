const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        // Check existing user
        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email already registered",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // Create user
        const [result] = await db.query(
            `INSERT INTO users
            (name, email, password, preferred_language)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                email,
                hashedPassword,
                "en",
            ]
        );

        return res.status(201).json({
            message: "Registration successful",
            userId: result.insertId,
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Registration failed",
        });
    }
};


// =========================
// LOGIN
// =========================

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        // Find user
        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const user = users[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                preferred_language:
                    user.preferred_language || "en",
            },
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Login failed",
        });
    }
};


module.exports = {
    register,
    login,
};