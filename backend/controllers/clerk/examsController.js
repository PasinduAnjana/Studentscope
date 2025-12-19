const clerkService = require("../../services/clerkService");

// Get all exams
exports.getAllExams = async (req, res) => {
  try {
    const exams = await clerkService.getAllExams();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(exams));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

// Create new exam
exports.createExam = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
        try {
            const data = JSON.parse(body);
            const exam = await clerkService.createExam(data);
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(exam));
        } catch(e) {
            console.error(e);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid Data" }));
        }
    });

  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

// Get students enrolled in an exam
exports.getExamStudents = async (req, res) => {
    try {
        const urlParts = req.url.split('/');
        const examId = urlParts[urlParts.indexOf('exams') + 1];
        
        const students = await clerkService.getEnrolledStudents(examId);
         res.writeHead(200, { "Content-Type": "application/json" });
         res.end(JSON.stringify(students));
    } catch(err) {
         res.writeHead(500, { "Content-Type": "application/json" });
         res.end(JSON.stringify({ error: err.message }));
    }
}

// Enroll students
exports.enrollStudents = async (req, res) => {
    try {
        const urlParts = req.url.split('/');
        const examId = urlParts[urlParts.indexOf('exams') + 1];
        
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
             try {
                const { students } = JSON.parse(body); // [{student_id, index_number}]
                await clerkService.enrollStudents(examId, students);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
             } catch(e) {
                 res.writeHead(500, { "Content-Type": "application/json" });
                 res.end(JSON.stringify({ error: e.message }));
             }
        });
    } catch(err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
    }
}

// Save marks
exports.saveMarks = async (req, res) => {
    try {
         const urlParts = req.url.split('/');
        const examId = urlParts[urlParts.indexOf('exams') + 1];
        
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
             try {
                const marksData = JSON.parse(body); 
                await clerkService.saveExamMarks(examId, marksData);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
             } catch(e) {
                 res.writeHead(500, { "Content-Type": "application/json" });
                 res.end(JSON.stringify({ error: e.message }));
             }
        });
    } catch(err) {
         res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
    }
}
// Import enrollments from CSV data
exports.importEnrollments = async (req, res) => {
    try {
        const urlParts = req.url.split('/');
        const examId = urlParts[urlParts.indexOf('exams') + 1];
        
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
             try {
                const { data } = JSON.parse(body); // [{username, index_number}]
                const result = await clerkService.importExamEnrollments(examId, data);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
             } catch(e) {
                 res.writeHead(500, { "Content-Type": "application/json" });
                 res.end(JSON.stringify({ error: e.message }));
             }
        });
    } catch(err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
    }
}

// Get exam marks
exports.getMarks = async (req, res) => {
    try {
        const urlParts = req.url.split('/');
        const examId = urlParts[urlParts.indexOf('exams') + 1];
        
        const marks = await clerkService.getExamMarks(examId);
         res.writeHead(200, { "Content-Type": "application/json" });
         res.end(JSON.stringify(marks));
    } catch(err) {
         res.writeHead(500, { "Content-Type": "application/json" });
         res.end(JSON.stringify({ error: err.message }));
    }
}
