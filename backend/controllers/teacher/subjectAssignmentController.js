const teacherService = require("../../services/teacherService");

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await teacherService.getStudents();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};

// Get students by class ID
exports.getStudentsByClass = async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);

    if (isNaN(classId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid class ID" }));
    }

    // Access Control: Allow if Class Teacher of this class OR Subject Teacher of this class
    let hasAccess = false;

    // 1. Check if they are the Class Teacher for this specific class
    if (req.user.is_class_teacher && String(req.user.class_id) === String(classId)) {
        hasAccess = true;
    } 
    
    // 2. Check if they teach any subject in this class
    if (!hasAccess) {
        const teacherSubjects = await teacherService.getTeacherClassSubjects(req.user.userId, classId);
        if (teacherSubjects && teacherSubjects.length > 0) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "You do not have access to this class's students" })
      );
    }

    const students = await teacherService.getStudentsByClass(classId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await teacherService.getSubjects();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(subjects));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch subjects" }));
  }
};

// Get class information
exports.getClassInfo = async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);

    if (isNaN(classId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid class ID" }));
    }

    const classInfo = await teacherService.getClassInfo(classId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classInfo));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch class information" }));
  }
};

// Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await teacherService.getAllClasses();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch classes" }));
  }
};

// Get class subjects (mandatory subjects)
exports.getClassSubjects = async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);

    if (isNaN(classId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid class ID" }));
    }

    const classSubjects = await teacherService.getClassSubjects(classId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classSubjects));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch class subjects" }));
  }
};

// Get grade subject rules
exports.getGradeSubjectRules = async (req, res) => {
  try {
    const grade = parseInt(req.params.grade, 10);

    if (isNaN(grade)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid grade" }));
    }

    const rules = await teacherService.getGradeSubjectRules(grade);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rules));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch grade rules" }));
  }
};

// Get student's current subject assignments
exports.getStudentSubjects = async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);

    if (isNaN(studentId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid student ID" }));
    }

    const subjects = await teacherService.getStudentSubjects(studentId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(subjects));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch student subjects" }));
  }
};

// Get elective subjects for a class
exports.getElectiveSubjects = async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);

    if (isNaN(classId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid class ID" }));
    }

    const electiveSubjects = await teacherService.getElectiveSubjects(classId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(electiveSubjects));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch elective subjects" }));
  }
};

// Get teacher's assigned classes
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId =
      req.user && req.user.userId ? parseInt(req.user.userId, 10) : null;
    if (!teacherId || isNaN(teacherId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid teacher ID" }));
    }
    const classes = await teacherService.getTeacherClasses(teacherId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch teacher classes" }));
  }
};

// Save individual student subject assignment
exports.saveStudentSubjects = async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);

    if (isNaN(studentId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid student ID" }));
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { subject_ids } = JSON.parse(body);

        if (!Array.isArray(subject_ids)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Subject IDs must be an array" })
          );
        }

        const result = await teacherService.saveStudentSubjects(
          studentId,
          subject_ids
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON data" }));
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to save student subjects" }));
  }
};

// Save multiple students' subject assignments (batch operation)
exports.saveMultipleStudentSubjects = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { assignments } = JSON.parse(body);

        if (!Array.isArray(assignments)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Assignments must be an array" })
          );
        }

        // Validate assignment structure
        for (const assignment of assignments) {
          if (
            !assignment.student_id ||
            !Array.isArray(assignment.subject_ids)
          ) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(
              JSON.stringify({
                error:
                  "Each assignment must have student_id and subject_ids array",
              })
            );
          }
        }

        const result = await teacherService.saveMultipleStudentSubjects(
          assignments
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON data" }));
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to save student subjects" }));
  }
};

// Combined endpoint to get all data needed for subject assignment page
exports.getSubjectAssignmentData = async (req, res) => {
  try {
    const classId = parseInt(req.params.classId, 10);

    if (isNaN(classId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid class ID" }));
    }

    // Fetch all required data in parallel
    const [students, subjects, classInfo, classSubjects, electiveSubjects] =
      await Promise.all([
        teacherService.getStudentsByClass(classId),
        teacherService.getSubjects(),
        teacherService.getClassInfo(classId),
        teacherService.getClassSubjects(classId),
        teacherService.getElectiveSubjects(classId),
      ]);

    // Get grade rules
    const gradeRules = await teacherService.getGradeSubjectRules(
      classInfo.grade
    );

    // Get existing student subject assignments
    const studentSubjects = {};
    for (const student of students) {
      studentSubjects[student.id] = await teacherService.getStudentSubjects(
        student.id
      );
    }

    const responseData = {
      students,
      subjects,
      classInfo,
      classSubjects,
      electiveSubjects,
      gradeRules,
      studentSubjects,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(responseData));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Failed to fetch subject assignment data" })
    );
  }
};

// Add this to your subjectAssignmentController.js file
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await teacherService.getAllClasses();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch classes" }));
  }
};
