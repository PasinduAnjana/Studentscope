const crypto = require("crypto");
const pool = require(".");
const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
}

async function createUser(
  username,
  rawPassword,
  roleName,
  classId = null,
  isClassTeacher = false
) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(rawPassword, salt);

  const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1", [
    roleName,
  ]);
  if (!roleRes.rows.length) throw new Error(`Role "${roleName}" not found`);
  const roleId = roleRes.rows[0].id;

  const res = await pool.query(
    `INSERT INTO users (username, password, salt, role_id, class_id, is_class_teacher)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [username, hashedPassword, salt, roleId, classId, isClassTeacher]
  );

  return res.rows[0].id;
}

async function run() {
  try {
    console.log("⏳ Seeding database...");

    // 1️⃣ Roles
    const roles = ["admin", "teacher", "student", "clerk"];
    for (const role of roles) {
      await pool.query(
        `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [role]
      );
    }

    // 2️⃣ Classes
    const grades = [1, 6, 10, 12];
    const classNames = ["A", "B"];
    const classes = [];
    for (const grade of grades) {
      for (const name of classNames) {
        classes.push([name, grade]);
      }
    }
    // classIds: { '1-A': id, '1-B': id, ... }
    const classIds = {};
    for (const [name, grade] of classes) {
      const res = await pool.query(
        `INSERT INTO classes (name, grade) VALUES ($1, $2) RETURNING id`,
        [name, grade]
      );
      classIds[`${grade}-${name}`] = res.rows[0].id;
    }

    // 3️⃣ Subjects by grade (compulsory)
    const subjectsByGrade = {
      "1-5": [
        "First Language",
        "English Language",
        "Mathematics",
        "Environmental Studies",
        "Religion",
        "Aesthetic Education",
        "Physical Education",
      ],
      "6-9": [
        "First Language",
        "English Language",
        "Mathematics",
        "Science",
        "History",
        "Religion",
        "Civics",
        "Health & Physical Education",
        "Aesthetic Education",
      ],
      "10-11": [
        "First Language",
        "English Language",
        "Mathematics",
        "Science",
        "Religion",
        "History",
      ],
      "12-13": ["General English", "Common General Test"],
    };

    // Electives
    const studentElectives = {
      "6-9": [
        "Practical and Technical Skills",
        "Drama",
        "Dance",
        "Art",
        "Music",
      ],
      "10-11": [
        "Business & Accounting Studies",
        "Geography",
        "Civic Education",
        "Agriculture & Food Technology",
        "ICT",
        "Health & Physical Education",
        "Aesthetic Subjects",
        "Home Science",
        "Technical Subjects",
      ],
      "12-13": [
        "Physics",
        "Chemistry",
        "Biology",
        "Combined Mathematics",
        "ICT",
        "Business Studies",
        "Accounting",
        "Economics",
        "History",
        "Political Science",
        "Sinhala Literature",
        "Tamil Literature",
        "English Literature",
        "Geography",
        "Logic",
        "Religion",
        "Performing Arts",
        "Engineering Technology",
        "Bio-System Technology",
        "Science for Technology",
      ],
    };

    // 4️⃣ Insert all subjects (deduplicated)
    const subjectIdsMap = {};
    const allSubjects = new Set();
    Object.values(subjectsByGrade).forEach((arr) =>
      arr.forEach((s) => allSubjects.add(s))
    );
    Object.values(studentElectives).forEach((arr) =>
      arr.forEach((s) => allSubjects.add(s))
    );

    for (const name of allSubjects) {
      const res = await pool.query(
        `INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
        [name]
      );
      let id;
      if (res.rows.length) id = res.rows[0].id;
      else {
        const existing = await pool.query(
          "SELECT id FROM subjects WHERE name=$1",
          [name]
        );
        id = existing.rows[0].id;
      }
      subjectIdsMap[name] = id;
    }

    // 5️⃣ Class subjects (mandatory)
    const classSubjectsMapping = {
      1: subjectsByGrade["1-5"],
      6: subjectsByGrade["6-9"],
      10: subjectsByGrade["10-11"],
      12: subjectsByGrade["12-13"],
    };
    for (const grade of grades) {
      for (const name of classNames) {
        const classId = classIds[`${grade}-${name}`];
        const subjects = classSubjectsMapping[grade];
        for (let i = 0; i < subjects.length; i++) {
          const subId = subjectIdsMap[subjects[i]];
          await pool.query(
            `INSERT INTO class_subjects (class_id, subject_id, is_common, display_order)
             VALUES ($1, $2, true, $3)`,
            [classId, subId, i + 1]
          );
        }
      }
    }

    // 6️⃣ Grade subject rules (elective counts)
    const gradeRules = [
      [1, 0],
      [6, 1],
      [10, 3],
      [12, 3],
    ];
    for (const [grade, electiveCount] of gradeRules) {
      await pool.query(
        `INSERT INTO grade_subject_rules (grade, elective_count) VALUES ($1, $2)`,
        [grade, electiveCount]
      );
    }

    // 7️⃣ Insert elective subjects into grade_subjects
    const electiveMapping = {
      6: studentElectives["6-9"],
      10: studentElectives["10-11"],
      12: studentElectives["12-13"],
    };
    for (const grade in electiveMapping) {
      const electives = electiveMapping[grade];
      for (let i = 0; i < electives.length; i++) {
        const subId = subjectIdsMap[electives[i]];
        await pool.query(
          `INSERT INTO grade_subjects (grade, subject_id, type, display_order)
           VALUES ($1, $2, 'elective', $3)`,
          [grade, subId, i + 1]
        );
      }
    }

    // 8️⃣ Users
    const adminId = await createUser("admin", "123", "admin");
    const clerkId = await createUser("clerk", "123", "clerk");

    // teacherIds: { '1-A': id, ... }
    const teacherIds = {};
    for (const grade of grades) {
      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        const tId = await createUser(
          `teacher${classKey}`,
          "123",
          "teacher",
          classIds[classKey],
          true
        );
        teacherIds[classKey] = tId;
        await pool.query(
          `INSERT INTO class_teachers (teacher_id, class_id) VALUES ($1,$2)`,
          [tId, classIds[classKey]]
        );
      }
    }

    // 🔹 Teacher Details
    const teacherDetailsData = [
      {
        full_name: "Mr. Jayasuriya Perera",
        nic: "123456789V",
        address: "456 Palm Street, Colombo",
        phone_number: "+94-71-234-5678",
        past_schools: "Royal College, Colombo",
        appointment_date: "2018-06-15",
        first_appointment_date: "2015-01-10",
        level: 2,
        birthday: "1980-03-20",
      },
      {
        full_name: "Mrs. Kumari Silva",
        nic: "987654321V",
        address: "789 Hill Road, Kandy",
        phone_number: "+94-81-234-5678",
        past_schools: "Kandy High School",
        appointment_date: "2019-08-20",
        first_appointment_date: "2016-05-15",
        level: 2,
        birthday: "1982-07-14",
      },
      {
        full_name: "Mr. Ruwan Fernando",
        nic: "456789123V",
        address: "321 Beach Lane, Galle",
        phone_number: "+94-91-234-5678",
        past_schools: "Galle Central College",
        appointment_date: "2017-02-10",
        first_appointment_date: "2014-09-01",
        level: 3,
        birthday: "1978-11-25",
      },
      {
        full_name: "Miss. Nimal Jayasuriya",
        nic: "789456123V",
        address: "654 Temple Road, Matara",
        phone_number: "+94-41-234-5678",
        past_schools: "Matara Convent",
        appointment_date: "2020-01-15",
        first_appointment_date: "2017-07-20",
        level: 1,
        birthday: "1985-09-08",
      },
      {
        full_name: "Dr. Anusha Wijesinghe",
        nic: "321789456V",
        address: "987 Garden Avenue, Kurunegala",
        phone_number: "+94-37-234-5678",
        past_schools: "Kurunegala National School",
        appointment_date: "2016-11-20",
        first_appointment_date: "2013-03-10",
        level: 3,
        birthday: "1976-05-12",
      },
      {
        full_name: "Mr. Saman Gunawardena",
        nic: "654123789V",
        address: "147 Sunset Drive, Negombo",
        phone_number: "+94-31-234-5678",
        past_schools: "Negombo High School",
        appointment_date: "2019-03-25",
        first_appointment_date: "2015-10-05",
        level: 2,
        birthday: "1981-12-30",
      },
      {
        full_name: "Miss. Dilani Rajapaksha",
        nic: "159357852V",
        address: "369 North Street, Jaffna",
        phone_number: "+94-21-234-5678",
        past_schools: "Jaffna Central College",
        appointment_date: "2021-06-10",
        first_appointment_date: "2018-02-14",
        level: 1,
        birthday: "1987-04-22",
      },
      {
        full_name: "Mr. Chathura Dissanayake",
        nic: "258369147V",
        address: "741 Mountain View, Badulla",
        phone_number: "+94-55-234-5678",
        past_schools: "Badulla National School",
        appointment_date: "2018-09-05",
        first_appointment_date: "2015-12-01",
        level: 2,
        birthday: "1979-08-17",
      },
    ];

    let teacherDetailIdx = 0;
    for (const classKey in teacherIds) {
      const tId = teacherIds[classKey];
      const detailData =
        teacherDetailsData[teacherDetailIdx % teacherDetailsData.length];
      await pool.query(
        `INSERT INTO teacher_details (teacher_id, full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, level, birthday)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tId,
          detailData.full_name,
          detailData.nic,
          detailData.address,
          detailData.phone_number,
          detailData.past_schools,
          detailData.appointment_date,
          detailData.first_appointment_date,
          detailData.level,
          detailData.birthday,
        ]
      );
      teacherDetailIdx++;
    }

    // 8.5️⃣ Clerk Details
    const clerkDetailsData = {
      full_name: "Chaminda Fernando",
      nic: "850123456V",
      address: "45 Main Street, Colombo 05",
      phone_number: "077-1234567",
      past_schools: "Royal College Colombo, Ananda College Colombo",
      appointment_date: "2015-03-15",
      first_appointment_date: "2010-01-10",
      birthday: "1985-05-20",
    };

    await pool.query(
      `INSERT INTO clerk_details (clerk_id, full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, birthday)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        clerkId,
        clerkDetailsData.full_name,
        clerkDetailsData.nic,
        clerkDetailsData.address,
        clerkDetailsData.phone_number,
        clerkDetailsData.past_schools,
        clerkDetailsData.appointment_date,
        clerkDetailsData.first_appointment_date,
        clerkDetailsData.birthday,
      ]
    );

    // 9️⃣ Parents
    const parentList = [
      { name: "Sunil Perera", address: "Colombo" },
      { name: "Kumari Silva", address: "Kandy" },
      { name: "Ruwan Fernando", address: "Galle" },
      { name: "Nimal Jayasuriya", address: "Matara" },
      { name: "Anusha Wijesinghe", address: "Kurunegala" },
      { name: "Saman Gunawardena", address: "Negombo" },
      { name: "Dilani Rajapaksha", address: "Jaffna" },
      { name: "Chathura Dissanayake", address: "Badulla" },
    ];
    const parentIds = [];
    for (const parent of parentList) {
      const res = await pool.query(
        `INSERT INTO parents (name, address) VALUES ($1, $2) RETURNING id`,
        [parent.name, parent.address]
      );
      parentIds.push(res.rows[0].id);
    }

    // 9️⃣ Students
    // Unique student info for each class
    const uniqueStudentsList = [
      [
        {
          full_name: "Amal Perera",
          birthday: "2012-01-10",
          address: "Colombo",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Kamal Silva",
          birthday: "2012-03-15",
          address: "Kandy",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Nimal Fernando",
          birthday: "2012-05-20",
          address: "Galle",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Sunil Jayasuriya",
          birthday: "2012-07-25",
          address: "Matara",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Anusha Wijesinghe",
          birthday: "2012-09-30",
          address: "Kurunegala",
          gender: "F",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Sajith Gunawardena",
          birthday: "2011-02-12",
          address: "Negombo",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Ishara Rajapaksha",
          birthday: "2011-04-18",
          address: "Jaffna",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Dilshan Dissanayake",
          birthday: "2011-06-22",
          address: "Badulla",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Hashini Perera",
          birthday: "2011-08-29",
          address: "Colombo",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Ruwan Silva",
          birthday: "2011-10-05",
          address: "Kandy",
          gender: "M",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Chathura Fernando",
          birthday: "2010-01-10",
          address: "Galle",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Lakshan Jayasuriya",
          birthday: "2010-03-15",
          address: "Matara",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Shanika Wijesinghe",
          birthday: "2010-05-20",
          address: "Kurunegala",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Thilina Gunawardena",
          birthday: "2010-07-25",
          address: "Negombo",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Manori Rajapaksha",
          birthday: "2010-09-30",
          address: "Jaffna",
          gender: "F",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Dinusha Dissanayake",
          birthday: "2009-02-12",
          address: "Badulla",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Gayathri Perera",
          birthday: "2009-04-18",
          address: "Colombo",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Pasindu Silva",
          birthday: "2009-06-22",
          address: "Kandy",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Sandeepa Fernando",
          birthday: "2009-08-29",
          address: "Galle",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Isuru Jayasuriya",
          birthday: "2009-10-05",
          address: "Matara",
          gender: "M",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Kasun Wijesinghe",
          birthday: "2008-01-10",
          address: "Kurunegala",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Nadeesha Gunawardena",
          birthday: "2008-03-15",
          address: "Negombo",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Rashmi Rajapaksha",
          birthday: "2008-05-20",
          address: "Jaffna",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Suresh Dissanayake",
          birthday: "2008-07-25",
          address: "Badulla",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Tharushi Perera",
          birthday: "2008-09-30",
          address: "Colombo",
          gender: "F",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Prasad Silva",
          birthday: "2007-02-12",
          address: "Kandy",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Nuwan Fernando",
          birthday: "2007-04-18",
          address: "Galle",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Harsha Jayasuriya",
          birthday: "2007-06-22",
          address: "Matara",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Sanduni Wijesinghe",
          birthday: "2007-08-29",
          address: "Kurunegala",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Malsha Gunawardena",
          birthday: "2007-10-05",
          address: "Negombo",
          gender: "F",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Janith Rajapaksha",
          birthday: "2006-01-10",
          address: "Jaffna",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Sithara Dissanayake",
          birthday: "2006-03-15",
          address: "Badulla",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Ravindu Perera",
          birthday: "2006-05-20",
          address: "Colombo",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Nimesha Silva",
          birthday: "2006-07-25",
          address: "Kandy",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Chathuni Fernando",
          birthday: "2006-09-30",
          address: "Galle",
          gender: "F",
          nationality: "Sri Lankan",
        },
      ],
      [
        {
          full_name: "Sahan Jayasuriya",
          birthday: "2005-02-12",
          address: "Matara",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Thilini Wijesinghe",
          birthday: "2005-04-18",
          address: "Kurunegala",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Dulakshi Gunawardena",
          birthday: "2005-06-22",
          address: "Negombo",
          gender: "F",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Ravindu Rajapaksha",
          birthday: "2005-08-29",
          address: "Jaffna",
          gender: "M",
          nationality: "Sri Lankan",
        },
        {
          full_name: "Nimesha Dissanayake",
          birthday: "2005-10-05",
          address: "Badulla",
          gender: "F",
          nationality: "Sri Lankan",
        },
      ],
    ];
    const studentsByClass = {};
    let nameIdx = 0;
    for (const grade of grades) {
      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        studentsByClass[classKey] =
          uniqueStudentsList[nameIdx % uniqueStudentsList.length];
        nameIdx++;
      }
    }
    const studentIds = {};
    let studentIndexCounter = 1000;
    for (const classKey in studentsByClass) {
      studentIds[classKey] = [];
      for (let i = 0; i < studentsByClass[classKey].length; i++) {
        const student = studentsByClass[classKey][i];
        const indexNumber = `S${studentIndexCounter++}`;
        // Create user with index number as username
        const sId = await createUser(
          indexNumber,
          "123",
          "student",
          classIds[classKey]
        );
        studentIds[classKey].push(sId);
        // Assign parent (round robin)
        const parentId = parentIds[(i + nameIdx) % parentIds.length];
        // Insert student details
        await pool.query(
          `INSERT INTO students (user_id, full_name, birthday, address, gender, nationality, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sId,
            student.full_name,
            student.birthday,
            student.address,
            student.gender,
            student.nationality,
            parentId,
          ]
        );
      }
    }

    // 🔟 Teacher-Subjects mapping (teachers cover compulsory subjects)
    for (const classKey in teacherIds) {
      const tId = teacherIds[classKey];
      const classId = classIds[classKey];
      // Extract grade from classKey
      const grade = parseInt(classKey.split("-")[0]);
      const subjects = classSubjectsMapping[grade];
      // Assign all compulsory subjects in their own class
      for (const subName of subjects) {
        await pool.query(
          `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES ($1,$2,$3)`,
          [tId, subjectIdsMap[subName], classId]
        );
      }

      // Assign teacher to teach one subject in 2-3 other classes
      const otherClassKeys = Object.keys(classIds).filter(
        (k) => k !== classKey
      );
      // Shuffle and pick 2 or 3 other classes
      const shuffled = otherClassKeys.sort(() => Math.random() - 0.5);
      const numOtherClasses = Math.floor(Math.random() * 2) + 2; // 2 or 3
      for (let i = 0; i < numOtherClasses && i < shuffled.length; i++) {
        const otherClassKey = shuffled[i];
        const otherClassId = classIds[otherClassKey];
        const otherGrade = parseInt(otherClassKey.split("-")[0]);
        const otherSubjects = classSubjectsMapping[otherGrade];
        // Pick a random subject from compulsory subjects
        const randomSub =
          otherSubjects[Math.floor(Math.random() * otherSubjects.length)];
        await pool.query(
          `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES ($1,$2,$3)`,
          [tId, subjectIdsMap[randomSub], otherClassId]
        );
      }
    }

    // 1️⃣1️⃣ Assign elective subjects to students
    const assignElectives = [
      [6, 1],
      [10, 3],
      [12, 3],
    ];
    for (const [grade, count] of assignElectives) {
      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        studentIds[classKey].forEach((sId, i) => {
          const values = [];
          for (let j = 0; j < count; j++) {
            const subId =
              subjectIdsMap[
                electiveMapping[grade][(i + j) % electiveMapping[grade].length]
              ];
            values.push(`(${sId},${subId})`);
          }
          const query = `INSERT INTO student_subjects (student_id, subject_id) VALUES ${values.join(
            ","
          )}`;
          pool.query(query);
        });
      }
    }

    // 1️⃣2️⃣ Timetable
    // For each class, subject, teacher, find teacher_subject_id and use it for timetable
    for (const grade of grades) {
      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        const classId = classIds[classKey];
        const tId = teacherIds[classKey];
        const subjects = classSubjectsMapping[grade].map(
          (name) => subjectIdsMap[name]
        );
        let idx = 0;
        for (let day = 1; day <= 5; day++) {
          for (let slot = 1; slot <= 8; slot++) {
            const subId = subjects[idx % subjects.length];
            // Find teacher_subject_id for this teacher, subject, class
            const tsRes = await pool.query(
              `SELECT id FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3 LIMIT 1`,
              [tId, subId, classId]
            );
            if (!tsRes.rows.length) {
              throw new Error(
                `teacher_subjects not found for teacher ${tId}, subject ${subId}, class ${classId}`
              );
            }
            const teacherSubjectId = tsRes.rows[0].id;
            await pool.query(
              `INSERT INTO timetables (teacher_subject_id, day_of_week, slot)
               VALUES ($1,$2,$3)`,
              [teacherSubjectId, day, slot]
            );
            idx++;
          }
        }
      }
    }

    // 1️⃣3️⃣ Attendance for last 10 days
    const today = new Date();
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      for (const classKey in studentIds) {
        const classId = classIds[classKey];
        const students = studentIds[classKey];
        for (const studentId of students) {
          const status = Math.random() > 0.1; // 90% present
          await pool.query(
            `INSERT INTO attendance (student_id, class_id, date, status) VALUES ($1, $2, $3, $4)`,
            [studentId, classId, dateStr, status]
          );
        }
      }
    }

    console.log(
      "🎉 Database seeded successfully with electives, subjects, timetable, and attendance!"
    );
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await pool.end();
  }
}

run();
