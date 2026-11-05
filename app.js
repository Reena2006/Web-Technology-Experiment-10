
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 5000;

const mongoURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(mongoURL);

// Middleware to read HTML form data
app.use(express.urlencoded({ extended: true }));

// Escape HTML before displaying submitted data
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

// Hash password before storing it
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(password, salt, 64).toString("hex");

    return salt + ":" + hash;
}

// Display registration form
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

// Handle form submission
app.post("/server", async (req, res) => {

    try {

        const {
            name,
            password,
            age,
            mobile,
            email,
            gender,
            state
        } = req.body;

        // Handle checkbox values
        const skills = Array.isArray(req.body.skills)
            ? req.body.skills
            : req.body.skills
                ? [req.body.skills]
                : [];

        // Required field validation
        if (
            !name || !password || !age || !mobile ||
            !email || !gender || !state || skills.length === 0
        ) {
            return res.status(400).send("All fields are mandatory.");
        }

        // Validate name
        if (!/^[A-Za-z ]+$/.test(name)) {
            return res.status(400).send("Invalid name.");
        }

        // Validate password
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(password)) {
            return res.status(400).send("Invalid password format.");
        }

        // Validate age
        if (
            !Number.isInteger(Number(age)) ||
            Number(age) < 18 ||
            Number(age) > 100
        ) {
            return res.status(400).send("Invalid age.");
        }

        // Validate mobile number
        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).send(
                "Mobile number must contain 10 digits."
            );
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("Invalid email.");
        }

        // Validate gender
        if (!["Male", "Female"].includes(gender)) {
            return res.status(400).send("Invalid gender.");
        }

        // Validate state
        const allowedStates = [
            "Tamil Nadu",
            "Kerala",
            "Karnataka",
            "Andhra Pradesh",
            "Telangana",
            "Maharashtra",
            "Other"
        ];

        if (!allowedStates.includes(state)) {
            return res.status(400).send("Invalid state.");
        }

        // Validate skills
        const allowedSkills = [
            "JavaScript",
            "Python",
            "C++",
            "Java"
        ];

        if (
            skills.some(skill => !allowedSkills.includes(skill))
        ) {
            return res.status(400).send("Invalid skill selection.");
        }

        // Access MongoDB database and collection
        const db = client.db("WebTechExp10");
        const collection = db.collection("registrations");

        // Create registration object
        const registration = {
            name: name.trim(),
            passwordHash: hashPassword(password),
            age: Number(age),
            mobile,
            email: email.trim(),
            gender,
            state,
            skills,
            createdAt: new Date()
        };

        // Insert registration into MongoDB
        await collection.insertOne(registration);

        // Retrieve all saved registrations
        const savedUsers = await collection
            .find({})
            .sort({ createdAt: -1, _id: -1 })
            .toArray();

        // Generate HTML table rows
        let rows = "";

        savedUsers.forEach(user => {

            rows += `
                <tr>
                    <td>${escapeHTML(user.name)}</td>
                    <td>******** (secured)</td>
                    <td>${escapeHTML(user.age)}</td>
                    <td>${escapeHTML(user.mobile)}</td>
                    <td>${escapeHTML(user.email)}</td>
                    <td>${escapeHTML(user.gender)}</td>
                    <td>${escapeHTML(user.state)}</td>
                    <td>${escapeHTML(user.skills.join(", "))}</td>
                    <td>${escapeHTML(
                        new Date(user.createdAt).toLocaleString()
                    )}</td>
                </tr>
            `;

        });

        // Display result page
        res.send(`
            <!DOCTYPE html>
            <html lang="en">

            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0">

                <title>User Submitted Details</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: #f1f5f9;
                        margin: 0;
                        padding: 25px;
                        color: #1e293b;
                    }

                    h1 {
                        text-align: center;
                        color: #1d4ed8;
                    }

                    .success {
                        text-align: center;
                        color: #166534;
                        background: #dcfce7;
                        padding: 15px;
                        border-radius: 8px;
                    }

                    .table-container {
                        width: 100%;
                        overflow-x: auto;
                        background: white;
                        border-radius: 8px;
                        padding: 10px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                    }

                    th, td {
                        border: 1px solid #cbd5e1;
                        padding: 12px;
                        text-align: left;
                        overflow-wrap: anywhere;
                    }

                    th {
                        background: #dbeafe;
                        color: #1e3a8a;
                    }

                    a {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 11px 18px;
                        background: #2563eb;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                    }
                </style>
            </head>

            <body>

                <h1>User Submitted Details</h1>

                <p class="success">
                    Registration saved successfully in MongoDB!
                </p>

                <div class="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Password</th>
                                <th>Age</th>
                                <th>Mobile Number</th>
                                <th>Email</th>
                                <th>Gender</th>
                                <th>State</th>
                                <th>Skills</th>
                                <th>Registration Date</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${rows}
                        </tbody>

                    </table>

                </div>

                <a href="/">Register Another User</a>

            </body>
            </html>
        `);

    } catch (error) {

        console.error("Registration error:", error);

        res.status(500).send(
            "An error occurred while saving the registration. " +
            "Check that MongoDB is running and try again."
        );

    }

});


// Start server after connecting to MongoDB
async function startServer() {

    try {

        await client.connect();

        await client.db("admin").command({ ping: 1 });

        console.log("MongoDB Connected Successfully");

        app.listen(PORT, () => {
            console.log(
                `Server running at http://localhost:${PORT}`
            );
        });

    } catch (error) {

        console.error(
            "Could not connect to MongoDB:",
            error.message
        );

        process.exit(1);

    }

}

startServer();
