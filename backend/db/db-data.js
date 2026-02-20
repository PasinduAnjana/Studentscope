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
    const grades = Array.from({ length: 13 }, (_, i) => i + 1);
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
    // Electives
    const studentElectives = {
      "6-9": [
        "Practical and Technical Skills",
        "Drama",
        "Dance",
        "Art",
        "Music",
      ],
      "10-11": {
        // Bucket 1 (History/Geo/etc)
        1: [
          "Geography",
          "Civic Education",
          "Entrepreneurial Studies",
          "Second Language (Sinhala/Tamil)"
        ],
        // Bucket 2 (Aesthetic)
        2: [
          "Music",
          "Art",
          "Dancing",
          "Drama",
          "Literature"
        ],
        // Bucket 3 (Technical/Science)
        3: [
          "ICT",
          "Health & Physical Education",
          "Home Economics",
          "Agriculture"
        ]
      },
      "12-13": {
        // Bucket 1 (Slot 1 Choices)
        1: [
          "Combined Mathematics",
          "Biology",
          "Arts",
          "Business Studies",
          "Engineering Technology"
        ],
        // Bucket 2 (Slot 2 Choices)
        2: [
          "Physics",
          "Chemistry",
          "Geography",
          "Accounting",
          "Biosystems Technology"
        ],
        // Bucket 3 (Slot 3 Choices)
        3: [
          "ICT",
          "Economics",
          "History",
          "Science for Technology",
          "English Literature",
          "Logic"
        ]
      }
    };

    // 4️⃣ Insert all subjects (deduplicated)
    const subjectIdsMap = {};
    const allSubjects = new Set();
    Object.values(subjectsByGrade).forEach((arr) =>
      arr.forEach((s) => allSubjects.add(s))
    );
    Object.entries(studentElectives).forEach(([gradeRange, val]) => {
      if (Array.isArray(val)) {
        val.forEach((s) => allSubjects.add(s));
      } else {
        // It's a bucket object (e.g. 10-11 or 12-13)
        Object.values(val).forEach(bucketSubjects =>
          bucketSubjects.forEach(s => allSubjects.add(s))
        );
      }
    });

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
    for (const grade of grades) {
      let subjects = [];
      if (grade <= 5) subjects = subjectsByGrade["1-5"];
      else if (grade <= 9) subjects = subjectsByGrade["6-9"];
      else if (grade <= 11) subjects = subjectsByGrade["10-11"];
      else subjects = subjectsByGrade["12-13"];

      for (const name of classNames) {
        const classId = classIds[`${grade}-${name}`];
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
    for (const grade of grades) {
      let electiveCount = 0;
      if (grade <= 5) electiveCount = 0;
      else if (grade <= 9) electiveCount = 1;
      else electiveCount = 3;

      await pool.query(
        `INSERT INTO grade_subject_rules (grade, elective_count) VALUES ($1, $2)`,
        [grade, electiveCount]
      );
    }

    // 7️⃣ Insert elective subjects into grade_subjects
    for (const grade of grades) {
      if (grade >= 10 && grade <= 11) {
        // 10-11 is special: Buckets
        const buckets = studentElectives["10-11"];
        for (const [bucketId, subjects] of Object.entries(buckets)) {
          for (let i = 0; i < subjects.length; i++) {
            const subId = subjectIdsMap[subjects[i]];
            await pool.query(
              `INSERT INTO grade_subjects (grade, subject_id, type, bucket_id, display_order)
                   VALUES ($1, $2, 'elective', $3, $4)`,
              [grade, subId, parseInt(bucketId), i + 1]
            );
          }
        }
      } else if (grade >= 12 && grade <= 13) {
        // 12-13 A-Levels: Buckets
        const buckets = studentElectives["12-13"];
        for (const [bucketId, subjects] of Object.entries(buckets)) {
          for (let i = 0; i < subjects.length; i++) {
            const subId = subjectIdsMap[subjects[i]];
            // Check if subject exists (safe check)
            if (subId) {
              await pool.query(
                `INSERT INTO grade_subjects (grade, subject_id, type, bucket_id, display_order)
                    VALUES ($1, $2, 'elective', $3, $4)`,
                [grade, subId, parseInt(bucketId), i + 1]
              );
            }
          }
        }
      } else {
        // Standard electives (no buckets used yet for others, or single bucket)
        let electives = [];
        if (grade >= 6 && grade <= 9) electives = studentElectives["6-9"];

        if (electives.length > 0) {
          for (let i = 0; i < electives.length; i++) {
            const subId = subjectIdsMap[electives[i]];
            await pool.query(
              `INSERT INTO grade_subjects (grade, subject_id, type, bucket_id, display_order)
                 VALUES ($1, $2, 'elective', 0, $3)`,
              [grade, subId, i + 1]
            );
          }
        }
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
    // 🔹 Helper Arrays for Random Generation
    const firstNamesMale = ["Amal", "Kamal", "Sunil", "Nimal", "Sajith", "Ruwan", "Chathura", "Thilina", "Dinusha", "Pasindu", "Isuru", "Kasun", "Suresh", "Prasad", "Nuwan", "Harsha", "Janith", "Ravindu", "Sahan", "Mahesh", "Lahiru", "Shehan", "Dilshan", "Asela", "Chamara"];
    const firstNamesFemale = ["Kumari", "Anusha", "Hashini", "Shanika", "Manori", "Gayathri", "Sandeepa", "Nadeesha", "Rashmi", "Tharushi", "Sanduni", "Malsha", "Sithara", "Nimesha", "Chathuni", "Thilini", "Dulakshi", "Dilani", "Chamari", "Kavindi", "Purnima", "Ishara", "Malki"];
    const lastNames = ["Perera", "Silva", "Fernando", "Jayasuriya", "Wijesinghe", "Gunawardena", "Rajapaksha", "Dissanayake", "Bandara", "Ranasinghe", "Karunaratne", "Ekanayake", "Herath", "Jayawardena", "Liyanage", "Gamage", "Senanayake", "Rathnayake"];
    const cities = ["Colombo", "Kandy", "Galle", "Matara", "Kurunegala", "Negombo", "Jaffna", "Badulla", "Anuradhapura", "Ratnapura", "Trincomalee", "Batticaloa", "Gampaha", "Kalutara", "Matale"];

    function getRandomElement(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateRandomPerson(role) {
      const isMale = Math.random() > 0.5;
      const firstName = isMale ? getRandomElement(firstNamesMale) : getRandomElement(firstNamesFemale);
      const lastName = getRandomElement(lastNames);
      const city = getRandomElement(cities);

      return {
        full_name: role === 'teacher' ? `${isMale ? 'Mr.' : 'Ms.'} ${firstName} ${lastName}` : `${firstName} ${lastName}`,
        gender: isMale ? 'M' : 'F',
        address: `${Math.floor(Math.random() * 100) + 1} Main St, ${city}`,
        city: city,
        nationality: "Sri Lankan"
      };
    }

    // 🔹 Generate Teacher Details Dynamically
    for (const classKey in teacherIds) {
      const tId = teacherIds[classKey];
      const person = generateRandomPerson('teacher');
      const birthYear = 1970 + Math.floor(Math.random() * 20); // 1970-1990

      await pool.query(
        `INSERT INTO teacher_details (teacher_id, full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, level, birthday)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tId,
          person.full_name,
          `${Math.floor(100000000 + Math.random() * 900000000)}V`, // Random NIC
          person.address,
          `+94-7${Math.floor(Math.random() * 9)}-${Math.floor(1000000 + Math.random() * 9000000)}`,
          `${person.city} Central College`,
          `${2015 + Math.floor(Math.random() * 8)}-01-15`,
          `${2010 + Math.floor(Math.random() * 5)}-05-20`,
          Math.floor(Math.random() * 3) + 1, // Level 1-3
          `${birthYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        ]
      );
    }

    // Old teacher loop removed since we do it above dynamically


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
    // 🔹 Generate Students Dynamically per Class
    const studentIds = {};
    let studentIndexCounter = 1000;

    // We want about 35-40 students per class
    // 13 grades * 2 classes = 26 classes.

    for (const grade of grades) {
      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        studentIds[classKey] = [];
        const classId = classIds[classKey];

        // Generate between 30 and 40 students per class
        const studentCount = 30 + Math.floor(Math.random() * 10);

        for (let i = 0; i < studentCount; i++) {
          const student = generateRandomPerson('student');
          const indexNumber = `S${studentIndexCounter++}`;

          // Birthday based on grade (approximate)
          // Grade 1 is approx 6 years old. Grade 13 is approx 18.
          // Current year is roughly 2025 (as per metadata), so birth year = 2025 - (grade + 5)
          const birthYear = 2025 - (grade + 5);
          const birthDate = `${birthYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;

          // Create user
          const sId = await createUser(indexNumber, "123", "student", classId);
          studentIds[classKey].push(sId);

          // Parent
          // Just picking a random parent from our generated list is complex if parents aren't linked. 
          // The original code assigned from a 'parentIds' list. We need to make sure 'parentIds' is populated sufficiently or reuse them.
          // Let's reuse the existing parent logic or make it cleaner.
          // Since we haven't touched the parent generation code yet, we assume 'parentIds' exists.
          // However, the original code had a fixed 'uniqueStudentsList' loop.

          // Pick a random parent ID
          const parentId = parentIds[Math.floor(Math.random() * parentIds.length)];

          await pool.query(
            `INSERT INTO students (user_id, full_name, birthday, address, gender, nationality, parent_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              sId,
              student.full_name,
              birthDate,
              student.address,
              student.gender,
              student.nationality,
              parentId
            ]
          );
        }
      }
    }

    // Helper function to get mandatory subjects
    const getMandatorySubjects = (grade) => {
      if (grade <= 5) return subjectsByGrade["1-5"];
      if (grade <= 9) return subjectsByGrade["6-9"];
      if (grade <= 11) return subjectsByGrade["10-11"];
      return subjectsByGrade["12-13"];
    };

    // Helper function to get electives
    const getElectives = (grade) => {
      if (grade >= 6 && grade <= 9) return studentElectives["6-9"];
      // For 10-11, we need to return a flattened list or handle it specially. 
      // This helper is used for checking if list exists. 
      if (grade >= 10 && grade <= 11) return studentElectives["10-11"];
      if (grade >= 12 && grade <= 13) return studentElectives["12-13"];
      return [];
    };

    // Helper: Get ALL subjects for a grade (Mandatory + Flattened Electives)
    const getAllSubjectsForGrade = (grade) => {
      const mandatory = getMandatorySubjects(grade);
      const electivesData = getElectives(grade);
      let electives = [];

      if (Array.isArray(electivesData)) {
        electives = electivesData;
      } else if (electivesData) {
        // Flatten bucket objects
        Object.values(electivesData).forEach(bucketList => {
          electives = [...electives, ...bucketList];
        });
      }
      // Deduplicate
      return [...new Set([...mandatory, ...electives])];
    };

    // 1️⃣1️⃣ Assign elective subjects to students
    for (const grade of grades) {
      // Check if we have electives for this grade
      const electivesData = getElectives(grade);
      if (!electivesData) continue;

      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        if (!studentIds[classKey]) continue;

        const students = studentIds[classKey];

        for (let i = 0; i < students.length; i++) {
          const sId = students[i];
          const values = [];

          if (grade >= 10 && grade <= 11) {
            // Buckets logic: Pick 1 from each bucket
            // electivesData is { 1: [...], 2: [...] }
            for (const subjects of Object.values(electivesData)) {
              // Pick random subject from this bucket
              // Use i to make it somewhat deterministic but distributed
              const subName = subjects[(i + Math.floor(Math.random() * subjects.length)) % subjects.length];
              const subId = subjectIdsMap[subName];
              values.push(`(${sId},${subId})`);
            }
          } else if (grade >= 12 && grade <= 13) {
            // A-Level Bucket Logic: Pick 1 from each bucket
            for (const subjects of Object.values(electivesData)) {
              // Pick random subject from this bucket
              // Use i to make it somewhat deterministic but distributed
              const subName = subjects[(i + Math.floor(Math.random() * subjects.length)) % subjects.length];
              const subId = subjectIdsMap[subName];
              if (subId) values.push(`(${sId},${subId})`);
            }
          } else {
            // Standard logic
            let electiveCount = 0;
            if (grade >= 6 && grade <= 9) electiveCount = 1;
            else if (grade >= 12) electiveCount = 3;

            const electivesList = electivesData;
            if (Array.isArray(electivesList) && electivesList.length > 0) {
              for (let j = 0; j < electiveCount; j++) {
                const subName = electivesList[(i + j) % electivesList.length];
                const subId = subjectIdsMap[subName];
                values.push(`(${sId},${subId})`);
              }
            }
          }
          if (values.length > 0) {
            const query = `INSERT INTO student_subjects (student_id, subject_id) VALUES ${values.join(",")}`;
            await pool.query(query);
          }
        }
      }
    }

    // 1️⃣2️⃣ Timetable
    // For each class, subject, teacher, find teacher_subject_id and use it for timetable
    // 1️⃣2️⃣ Timetable (Realistic & Timetable-Driven)
    // - Teachers specialize in specific subjects
    // - Teachers move between classes in their grade
    // - Free periods allowed

    // Group teachers by grade for pooling
    const teachersByGrade = {};
    for (const classKey in teacherIds) {
      const grade = parseInt(classKey.split("-")[0]);
      if (!teachersByGrade[grade]) teachersByGrade[grade] = [];
      teachersByGrade[grade].push(teacherIds[classKey]);
    }

    // Assign specialties and initialize schedule tracker


    // Assign specialties and initialize schedule tracker
    const teacherSpecialties = {};
    const teacherSchedule = {}; // tId -> day -> slot -> true
    const teacherAssignedSubjects = {}; // tId -> Set<subId> (Track unique subjects taught)

    // Flatten all teachers
    const allTeacherIds = Object.values(teacherIds);
    for (const tId of allTeacherIds) {
      teacherSchedule[tId] = {};
      teacherAssignedSubjects[tId] = new Set();
      for (let d = 1; d <= 5; d++) teacherSchedule[tId][d] = {};

      // Assign random specialties (2-3 subjects) based on their assigned grade context
      // Find which grade this teacher belongs to (roughly)
      let grade = 10; // Default
      for (const g in teachersByGrade) {
        if (teachersByGrade[g].includes(tId)) { grade = parseInt(g); break; }
      }
      const subjects = getAllSubjectsForGrade(grade);
      // Pick 3 random subjects
      const shuffled = [...subjects].sort(() => 0.5 - Math.random());
      teacherSpecialties[tId] = shuffled.slice(0, 3).map(name => subjectIdsMap[name]);
    }

    for (const grade of grades) {
      const subjectNames = getAllSubjectsForGrade(grade);
      const subjectSeq = subjectNames.map(name => subjectIdsMap[name]);

      for (const name of classNames) {
        const classKey = `${grade}-${name}`;
        const classId = classIds[classKey];

        // Standardize subject sequence for the class so it cycles through
        let subIdx = 0;

        for (let day = 1; day <= 5; day++) {
          for (let slot = 1; slot <= 8; slot++) {

            // 15% Chance of Free Period (only if not a primary grade where continuous supervision is needed)
            if (grade > 5 && Math.random() < 0.15) {
              continue; // Free period
            }

            const subId = subjectSeq[subIdx % subjectSeq.length];
            subIdx++;

            // Helper to check if teacher can take this subject
            const canTeach = (tId) => {
              const assigned = teacherAssignedSubjects[tId];
              // YES if already teaching this subject OR has room for more (<4)
              return assigned.has(subId) || assigned.size < 4;
            };

            // Find a teacher
            // Criteria 1: Specializes in subject AND is free AND can take subject
            const teacherPool = teachersByGrade[grade] || [];
            let chosenTeacher = teacherPool.find(tId =>
              teacherSpecialties[tId].includes(subId) &&
              !teacherSchedule[tId][day][slot] &&
              canTeach(tId)
            );

            // Criteria 2: Fallback - Any free teacher in grade who satisfies subject constraint
            if (!chosenTeacher) {
              chosenTeacher = teacherPool.find(tId =>
                !teacherSchedule[tId][day][slot] &&
                canTeach(tId)
              );
            }

            // Criteria 3: Last Resort - Any free teacher in system who satisfies subject constraint
            if (!chosenTeacher) {
              chosenTeacher = allTeacherIds.find(tId =>
                !teacherSchedule[tId][day][slot] &&
                canTeach(tId)
              );
            }

            if (!chosenTeacher) {
              // No teacher available? Skip slot (forced free period)
              continue;
            }

            // Mark busy and track subject
            teacherSchedule[chosenTeacher][day][slot] = true;
            teacherAssignedSubjects[chosenTeacher].add(subId);

            // 1. Ensure Teacher-Subject Assignment Exists
            await pool.query(
              `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING`,
              [chosenTeacher, subId, classId]
            );

            // 2. Get the ID
            const tsRes = await pool.query(
              `SELECT id FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3 LIMIT 1`,
              [chosenTeacher, subId, classId]
            );

            if (!tsRes.rows.length) {
              // Should not happen due to insert above
              continue;
            }
            const teacherSubjectId = tsRes.rows[0].id;

            // 3. Create Timetable Entry
            await pool.query(
              `INSERT INTO timetables (teacher_subject_id, day_of_week, slot)
               VALUES ($1,$2,$3)`,
              [teacherSubjectId, day, slot]
            );
          }
        }
      }
    }

    // 1️⃣3️⃣ Exams (Term Tests)
    // 1️⃣3️⃣ Exams (Term Tests and Gov Exams)
    const currentYear = new Date().getFullYear();
    const exams = [
      { name: `1st Term Test ${currentYear}`, type: 'term', sub_type: 'Term1', year: currentYear },
      { name: `2nd Term Test ${currentYear}`, type: 'term', sub_type: 'Term2', year: currentYear },
      { name: `3rd Term Test ${currentYear}`, type: 'term', sub_type: 'Term3', year: currentYear },
      { name: `GCE O/L ${currentYear}`, type: 'gov', sub_type: 'OL', year: currentYear, target_grade: 11 },
      { name: `GCE A/L ${currentYear}`, type: 'gov', sub_type: 'AL', year: currentYear, target_grade: 13 },
      { name: `Grade 5 Scholarship ${currentYear}`, type: 'gov', sub_type: 'Grade5', year: currentYear, target_grade: 5 },
    ];

    for (const exam of exams) {
      await pool.query(
        `INSERT INTO exams (name, type, sub_type, year, target_grade) VALUES ($1, $2, $3, $4, $5)`,
        [exam.name, exam.type, exam.sub_type, exam.year, exam.target_grade || null]
      );
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

    // 1️⃣4️⃣ Behavior Records for students
    const behaviorTypes = [
      {
        type: "Good",
        severity: null,
        desc: "Excellent participation in class",
      },
      { type: "Good", severity: null, desc: "Helped organize school event" },
      { type: "Disciplinary", severity: "Minor", desc: "Late to class" },
      {
        type: "Disciplinary",
        severity: "Serious",
        desc: "Disrupted classroom",
      },
      {
        type: "Reward",
        severity: null,
        desc: "Won inter-school quiz competition",
      },
      { type: "Reward", severity: null, desc: "100% attendance this term" },
    ];

    let behaviorIdx = 0;
    for (const classKey in studentIds) {
      const classId = classIds[classKey];
      const students = studentIds[classKey];

      // Get some teachers for reporting
      const teachersRes = await pool.query(
        `SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'teacher') LIMIT 5`
      );
      const teachers = teachersRes.rows.map((r) => r.id);

      for (const studentId of students.slice(0, Math.min(5, students.length))) {
        for (let j = 0; j < 2; j++) {
          const behavior = behaviorTypes[behaviorIdx % behaviorTypes.length];
          const daysAgo = Math.floor(Math.random() * 30);
          const recordDate = new Date(today);
          recordDate.setDate(today.getDate() - daysAgo);
          const dateStr = recordDate.toISOString();

          const reporterIndex = Math.floor(Math.random() * teachers.length);
          const reporterId = teachers[reporterIndex] || null;

          await pool.query(
            `INSERT INTO behavior_records (student_id, class_id, type, severity, description, reported_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              studentId,
              classId,
              behavior.type,
              behavior.severity,
              behavior.desc,
              reporterId,
              dateStr,
            ]
          );
          behaviorIdx++;
        }
      }
    }

    // 1️⃣5️⃣ Seed Marks and Enrollments for Term 1 and Term 2
    console.log("📝 Seeding marks and enrollments...");
    const termExamsRes = await pool.query("SELECT id, sub_type FROM exams WHERE type = 'term' AND year = $1", [currentYear]);
    const targetExams = termExamsRes.rows.filter(e => e.sub_type === 'Term1' || e.sub_type === 'Term2');

    for (const classKey in studentIds) {
      const classId = classIds[classKey];
      const grade = parseInt(classKey.split("-")[0]);
      const students = studentIds[classKey];

      // Mandatory subjects for this class
      const mandSubjects = getMandatorySubjects(grade);
      const mandSubIds = mandSubjects.map(name => subjectIdsMap[name]);

      for (const sId of students) {
        // Get electives for this student
        const elecRes = await pool.query("SELECT subject_id FROM student_subjects WHERE student_id = $1", [sId]);
        const elecSubIds = elecRes.rows.map(r => r.subject_id);
        const allSubIds = [...mandSubIds, ...elecSubIds];

        for (const exam of targetExams) {
          // 1. Enroll
          await pool.query(
            `INSERT INTO exam_students (exam_id, student_id, index_number) 
                     VALUES ($1, $2, $3)
                     ON CONFLICT (exam_id, student_id) DO NOTHING`,
            [exam.id, sId, `INDEX-${sId}`] // Simple index number
          );

          // 2. Add Marks
          for (const subId of allSubIds) {
            // Generate marks (skewed towards 40-90)
            const marks = Math.floor(Math.random() * 60) + 35; // 35 to 94

            await pool.query(
              `INSERT INTO marks (student_id, subject_id, marks, exam_id)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT DO NOTHING`,
              [sId, subId, marks.toString(), exam.id]
            );
          }
        }
      }
    }

    console.log(
      "🎉 Database seeded successfully with behavior records, timetable, attendance, and exam marks!"
    );
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await pool.end();
  }
}

run();
