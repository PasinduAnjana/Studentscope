const clerkService = require("../../services/clerkService");

// Get all exams
exports.getExams = async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const year = url.searchParams.get("year");
        const exams = await clerkService.getExams(year);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(exams));
    } catch (err) {
        console.error("Error fetching exams:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch exams" }));
    }
};

// Create exam
exports.createExam = async (req, res) => {
    try {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const data = JSON.parse(body);
                if (!data.name || !data.year) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "Name and Year are required" }));
                }
                const exam = await clerkService.createExam(data);
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify(exam));
            } catch (err) {
                console.error("Error creating exam:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to create exam" }));
            }
        });
    } catch (err) {
        console.error("Error in createExam:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
};

// Assign students
exports.assignStudents = async (req, res) => {
    try {
        const examId = req.url.split("/")[4]; // /api/clerk/exams/:id/students
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { student_ids } = JSON.parse(body);
                if (!student_ids || !Array.isArray(student_ids)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "student_ids array is required" }));
                }
                await clerkService.assignStudentsToExam(examId, student_ids);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error("Error assigning students:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to assign students" }));
            }
        });
    } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
};

// Get assigned students
exports.getExamStudents = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        const students = await clerkService.getExamStudents(examId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(students));
    } catch (err) {
        console.error("Error fetching exam students:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch exam students" }));
    }
};

// Save marks
exports.saveMarks = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { marks } = JSON.parse(body);
                if (!marks || !Array.isArray(marks)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "marks array is required" }));
                }
                await clerkService.saveExamMarks(examId, marks);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error("Error saving marks:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to save marks" }));
            }
        });
    } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
};

// Get marks
exports.getMarks = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        const url = new URL(req.url, `http://${req.headers.host}`);
        const subjectId = url.searchParams.get("subjectId");
        if (!subjectId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "subjectId is required" }));
        }
        const marks = await clerkService.getExamMarks(examId, subjectId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(marks));
    } catch (err) {
        console.error("Error fetching marks:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch marks" }));
    }
};

// Update student index number for an exam
exports.updateStudentIndex = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { student_id, index_number } = JSON.parse(body);
                if (!student_id) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "student_id is required" }));
                }
                const result = await clerkService.updateExamStudentIndex(examId, student_id, index_number);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result || { success: true }));
            } catch (err) {
                console.error("Error updating student index:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to update student index" }));
            }
        });
    } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
};

// Bulk import index numbers from CSV
exports.bulkImportIndex = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const { entries } = JSON.parse(body);
                if (!entries || !Array.isArray(entries) || entries.length === 0) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "entries array is required" }));
                }
                const result = await clerkService.bulkUpdateExamIndexNumbers(examId, entries);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error("Error bulk importing index numbers:", err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to import index numbers" }));
            }
        });
    } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
};

// Get exam subjects/columns for marks entry
exports.getExamSubjects = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        const result = await clerkService.getExamSubjects(examId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
    } catch (err) {
        console.error("Error fetching exam subjects:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch exam subjects" }));
    }
};

// Get all marks for an exam
exports.getAllExamMarks = async (req, res) => {
    try {
        const examId = req.url.split("/")[4];
        const result = await clerkService.getAllExamMarks(examId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
    } catch (err) {
        console.error("Error fetching all exam marks:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch exam marks" }));
    }
};

