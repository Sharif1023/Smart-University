-- Full development/demo dataset for schema.sql (MySQL 8.0.16+).
-- The file is repeatable: seed markers prevent duplicating the generated fixtures.
DELIMITER $$
DROP PROCEDURE IF EXISTS seed_campus_desk$$
CREATE PROCEDURE seed_campus_desk()
seed_main: BEGIN
  DECLARE v_hash VARCHAR(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'fd4c2e88e5e29cd1f6cacaefbc5af6d1.a2c20c840bf7c845517129bd00a51ab365d4daf5dea0f41509d36c232d04c32bfbedfc61a21b9e9feb06202162306bb9e5942d6257c1b094c29fe3d757fbc890';
  DECLARE v_admin INT;
  DECLARE v_student INT;
  DECLARE v_teacher INT;
  DECLARE v_advisor INT;
  DECLARE v_accounts INT;
  DECLARE v_librarian INT;
  DECLARE v_supervisor INT;
  DECLARE v_dept INT;
  DECLARE v_program INT;
  DECLARE v_base_course INT;
  DECLARE v_advanced_course INT;
  DECLARE v_lab_course INT;
  DECLARE v_year INT;
  DECLARE v_old_term INT;
  DECLARE v_current_term INT;
  DECLARE v_historical_offering INT;
  DECLARE v_current_offering INT;
  DECLARE v_student_id INT;
  DECLARE v_teacher_id INT;
  DECLARE v_advisor_id INT;
  DECLARE v_supervisor_id INT;
  DECLARE v_reg INT;
  DECLARE v_session INT;
  DECLARE v_bill INT;
  DECLARE v_invoice INT;
  DECLARE v_notice INT;
  DECLARE v_loan INT;
  DECLARE v_thesis INT;
  DECLARE v_submission INT;
  DECLARE v_audit INT;
  DECLARE v_book INT;
  DECLARE v_room INT;
  DECLARE v_fee INT;
  DECLARE v_i INT DEFAULT 0;
  DECLARE v_j INT DEFAULT 0;
  DECLARE v_n INT DEFAULT 0;
  DECLARE v_year_num INT;
  DECLARE v_subject VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE v_first VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE v_surname VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE v_code VARCHAR(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE v_batch VARCHAR(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE v_weekday VARCHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE v_start TIME;
  DECLARE v_end TIME;

  SET v_hash=COALESCE(@campus_demo_password_hash,v_hash);

  -- Additive portal release data is deliberately applied before the legacy
  -- seed guard so an already-seeded development database receives new fixtures.
  INSERT IGNORE INTO role_permissions(role_name,permission_name) VALUES
    ('ADMIN','exam_schedule'),('ADMIN','exam_state'),('ADMIN','attendance_review'),
    ('TEACHER','attendance_review'),('ADMIN','document_review'),
    ('STUDENT','grade_review_request'),('ADMIN','grade_review'),('TEACHER','grade_review'),
    ('STUDENT','attendance_request'),('STUDENT','document_request'),
    ('STUDENT','support_ticket'),('ADMIN','ticket_reply'),('STUDENT','ticket_reply'),
    ('ADMIN','ticket_status'),('STUDENT','reserve_book'),('STUDENT','cancel_reservation'),
    ('ADMIN','reservation_review'),('LIBRARIAN','reservation_review'),
    ('STUDENT','renewal_request'),('ADMIN','renewal_review'),('LIBRARIAN','renewal_review'),
    ('ADMIN','career_opportunity'),('STUDENT','career_apply'),('ADMIN','career_review'),
    ('ADMIN','notification_preferences'),('STUDENT','notification_preferences'),
    ('TEACHER','notification_preferences'),('ADVISOR','notification_preferences'),
    ('ACCOUNTS_OFFICER','notification_preferences'),('LIBRARIAN','notification_preferences'),
    ('THESIS_SUPERVISOR','notification_preferences');
  INSERT IGNORE INTO student_profiles(student) SELECT user_id FROM students;
  INSERT IGNORE INTO notification_preferences(user_id) SELECT id FROM users;
  INSERT INTO career_opportunities(title,organization,opportunity_type,description,location,deadline,status,created_by)
    SELECT 'Campus software engineering internship','Campus Innovation Lab','Internship',
      'A fictional supervised internship for students interested in building university services.','Dhaka',DATE_ADD(CURRENT_DATE,INTERVAL 60 DAY),'Published',u.id
    FROM users u WHERE u.email='admin@campus.test'
      AND NOT EXISTS(SELECT 1 FROM career_opportunities WHERE title='Campus software engineering internship' AND organization='Campus Innovation Lab');
  INSERT IGNORE INTO exam_schedules(offering,title,exam_type,exam_date,starts_at,ends_at,room,state,created_by)
    SELECT o.id,'Algorithms final examination','Final',DATE_ADD(s.ends_on,INTERVAL 2 DAY),'09:00:00','12:00:00',rm.id,'Published',admin.id
    FROM offerings o JOIN courses c ON c.id=o.course JOIN semesters s ON s.id=o.term
    JOIN rooms rm ON rm.name='Lecture Hall A' JOIN users admin ON admin.email='admin@campus.test'
    WHERE c.code='CSE201' AND s.code='LAB-2';
  INSERT INTO student_document_requests(student,document_type,purpose)
    SELECT u.id,'Enrollment certificate','Demo request for the current semester.' FROM users u
    WHERE u.email='student@campus.test' AND NOT EXISTS(
      SELECT 1 FROM student_document_requests r WHERE r.student=u.id AND r.document_type='Enrollment certificate' AND r.purpose='Demo request for the current semester.');
  INSERT INTO support_tickets(student,category,subject,description)
    SELECT u.id,'Technical','Demo portal support request','Use this fictional ticket to review the student support workflow.' FROM users u
    WHERE u.email='student@campus.test' AND NOT EXISTS(
      SELECT 1 FROM support_tickets t WHERE t.student=u.id AND t.subject='Demo portal support request');

  IF EXISTS (SELECT 1 FROM audit_logs WHERE action='SEED_THIRTY_V1') THEN
    LEAVE seed_main;
  END IF;

  START TRANSACTION;
  INSERT IGNORE INTO workflow_lock(id) VALUES(1);
  INSERT IGNORE INTO campus_settings(id,timezone_name,currency_code,date_locale)
    VALUES(1,'Asia/Dhaka','BDT','en-GB');

  INSERT IGNORE INTO users(email,name,role,password_hash) VALUES
    ('admin@campus.test','Samira Rahman','ADMIN',v_hash),
    ('student@campus.test','Ayesha Islam','STUDENT',v_hash),
    ('teacher@campus.test','Farhan Ahmed','TEACHER',v_hash),
    ('advisor@campus.test','Nadia Karim','ADVISOR',v_hash),
    ('accounts_officer@campus.test','Reza Hasan','ACCOUNTS_OFFICER',v_hash),
    ('librarian@campus.test','Ishrat Ali','LIBRARIAN',v_hash),
    ('thesis_supervisor@campus.test','Arif Chowdhury','THESIS_SUPERVISOR',v_hash);

  -- Role permissions are seeded from the action matrix used by the API.
  INSERT IGNORE INTO role_permissions(role_name,permission_name) VALUES
    ('ADMIN','coauthor'),
    ('LIBRARIAN','coauthor'),
    ('ADMIN','settings'),
    ('ADMIN','book_metadata'),
    ('LIBRARIAN','book_metadata'),
    ('ADMIN','copy_condition'),
    ('LIBRARIAN','copy_condition'),
    ('ADMIN','room_metadata'),
    ('ADMIN','fee_rule'),
    ('ACCOUNTS_OFFICER','fee_rule'),
    ('ADMIN','course_summary'),
    ('ADMIN','min_grade'),
    ('ADMIN','policy'),
    ('ADMIN','grade_band'),
    ('ADMIN','change_role'),
    ('ADMIN','admission'),
    ('ADMIN','employee'),
    ('ADMIN','section_state'),
    ('ADMIN','class_session'),
    ('TEACHER','class_session'),
    ('TEACHER','assessment'),
    ('TEACHER','assessment_mark'),
    ('TEACHER','calculate'),
    ('ADMIN','lock_result'),
    ('TEACHER','lock_result'),
    ('ADMIN','reopen'),
    ('ADMIN','add_item'),
    ('ACCOUNTS_OFFICER','add_item'),
    ('ADMIN','waiver_review'),
    ('ADMIN','void_receipt'),
    ('ACCOUNTS_OFFICER','void_receipt'),
    ('ADMIN','notice_state'),
    ('ADMIN','acknowledge'),
    ('STUDENT','acknowledge'),
    ('TEACHER','acknowledge'),
    ('ADVISOR','acknowledge'),
    ('THESIS_SUPERVISOR','acknowledge'),
    ('ACCOUNTS_OFFICER','acknowledge'),
    ('LIBRARIAN','acknowledge'),
    ('ADMIN','copy'),
    ('LIBRARIAN','copy'),
    ('ADMIN','issue_copy'),
    ('LIBRARIAN','issue_copy'),
    ('ADMIN','fine'),
    ('LIBRARIAN','fine'),
    ('ADMIN','room_block'),
    ('ADMIN','move'),
    ('ADMIN','review_routine'),
    ('STUDENT','thesis_draft'),
    ('ADMIN','revision'),
    ('THESIS_SUPERVISOR','revision'),
    ('THESIS_SUPERVISOR','feedback'),
    ('STUDENT','final_submit'),
    ('THESIS_SUPERVISOR','viva'),
    ('THESIS_SUPERVISOR','outcome'),
    ('ADMIN','user'),
    ('ADMIN','account_status'),
    ('ADMIN','profile'),
    ('ADMIN','faculty'),
    ('ADMIN','advise'),
    ('ADMIN','prerequisite'),
    ('ADMIN','offering'),
    ('STUDENT','register'),
    ('ADMIN','review'),
    ('ADVISOR','review'),
    ('STUDENT','drop'),
    ('TEACHER','attendance'),
    ('TEACHER','marks'),
    ('ADMIN','publish'),
    ('TEACHER','publish'),
    ('ADMIN','weight'),
    ('TEACHER','weight'),
    ('TEACHER','material'),
    ('ADMIN','fee_type'),
    ('ACCOUNTS_OFFICER','fee_type'),
    ('ADMIN','standard_invoice'),
    ('ACCOUNTS_OFFICER','standard_invoice'),
    ('ADMIN','invoice'),
    ('ACCOUNTS_OFFICER','invoice'),
    ('ADMIN','payment'),
    ('ACCOUNTS_OFFICER','payment'),
    ('ADMIN','notice'),
    ('ADMIN','read'),
    ('STUDENT','read'),
    ('TEACHER','read'),
    ('ADVISOR','read'),
    ('THESIS_SUPERVISOR','read'),
    ('ACCOUNTS_OFFICER','read'),
    ('LIBRARIAN','read'),
    ('ADMIN','book'),
    ('LIBRARIAN','book'),
    ('ADMIN','issue'),
    ('LIBRARIAN','issue'),
    ('ADMIN','return'),
    ('LIBRARIAN','return'),
    ('ADMIN','room'),
    ('TEACHER','block'),
    ('TEACHER','unblock'),
    ('ADMIN','generate'),
    ('ADMIN','release'),
    ('STUDENT','topic'),
    ('ADMIN','allocate'),
    ('STUDENT','progress'),
    ('THESIS_SUPERVISOR','progress'),
    ('THESIS_SUPERVISOR','milestone');

  SET v_admin=(SELECT id FROM users WHERE email='admin@campus.test');
  SET v_student=(SELECT id FROM users WHERE email='student@campus.test');
  SET v_teacher=(SELECT id FROM users WHERE email='teacher@campus.test');
  SET v_advisor=(SELECT id FROM users WHERE email='advisor@campus.test');
  SET v_accounts=(SELECT id FROM users WHERE email='accounts_officer@campus.test');
  SET v_librarian=(SELECT id FROM users WHERE email='librarian@campus.test');
  SET v_supervisor=(SELECT id FROM users WHERE email='thesis_supervisor@campus.test');

  INSERT IGNORE INTO departments(code,name) VALUES
    ('CSE','Computer Science & Engineering'),
    ('EEE','Electrical & Electronic Engineering');
  SET v_dept=(SELECT id FROM departments WHERE code='CSE');
  INSERT IGNORE INTO programs(code,name,department_id,credits)
    VALUES('BCSE','B.Sc. in Computer Science & Engineering',v_dept,160);
  SET v_program=(SELECT id FROM programs WHERE code='BCSE');
  INSERT IGNORE INTO academic_years(code,name,starts_on,ends_on)
    VALUES('AY26','Academic year 2026–27','2026-07-01','2027-06-30');
  SET v_year=(SELECT id FROM academic_years WHERE code='AY26');
  INSERT IGNORE INTO semesters(code,name,year_id,starts_on,ends_on,opens_on,closes_on,drop_on)
    VALUES('F26','Fall 2026',v_year,'2026-09-01','2026-12-31','2026-08-01','2026-09-07','2026-09-15');
  INSERT IGNORE INTO courses(code,name,department_id,credits)
    VALUES('CSE101','Introduction to Computing',v_dept,3);
  SET v_base_course=(SELECT id FROM courses WHERE code='CSE101');
  INSERT IGNORE INTO students(user_id,student_no,program_id,batch)
    VALUES(v_student,'2026-CSE-001',v_program,'2026');

  INSERT IGNORE INTO academic_years(code,name,starts_on,ends_on)
    VALUES('LAB-YR','Demonstration academic year',DATE_SUB(CURRENT_DATE,INTERVAL 250 DAY),DATE_ADD(CURRENT_DATE,INTERVAL 100 DAY));
  SET v_year=(SELECT id FROM academic_years WHERE code='LAB-YR');
  INSERT IGNORE INTO semesters(code,name,year_id,starts_on,ends_on,opens_on,closes_on,drop_on)
    VALUES
    ('LAB-1','Previous demonstration term',v_year,DATE_SUB(CURRENT_DATE,INTERVAL 200 DAY),DATE_SUB(CURRENT_DATE,INTERVAL 80 DAY),DATE_SUB(CURRENT_DATE,INTERVAL 220 DAY),DATE_SUB(CURRENT_DATE,INTERVAL 198 DAY),DATE_SUB(CURRENT_DATE,INTERVAL 195 DAY)),
    ('LAB-2','Current demonstration term',v_year,DATE_SUB(CURRENT_DATE,INTERVAL 7 DAY),DATE_ADD(CURRENT_DATE,INTERVAL 90 DAY),DATE_SUB(CURRENT_DATE,INTERVAL 15 DAY),DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY),DATE_ADD(CURRENT_DATE,INTERVAL 33 DAY));
  SET v_old_term=(SELECT id FROM semesters WHERE code='LAB-1');
  SET v_current_term=(SELECT id FROM semesters WHERE code='LAB-2');
  INSERT IGNORE INTO courses(code,name,department_id,credits) VALUES
    ('CSE201','Algorithms',v_dept,3),
    ('CSE202','Database systems lab',v_dept,1.5);
  SET v_advanced_course=(SELECT id FROM courses WHERE code='CSE201');
  SET v_lab_course=(SELECT id FROM courses WHERE code='CSE202');
  INSERT IGNORE INTO prerequisites(course,required_course)
    VALUES(v_advanced_course,v_base_course);
  INSERT IGNORE INTO advising(student,advisor) VALUES(v_student,v_advisor);
  INSERT IGNORE INTO faculty(user_id,department_id,designation) VALUES
    (v_teacher,v_dept,'Lecturer'),
    (v_advisor,v_dept,'Lecturer'),
    (v_supervisor,v_dept,'Lecturer');

  INSERT IGNORE INTO offerings(course,term,teacher,program,batch,section,capacity,kind)
    VALUES(v_base_course,v_old_term,v_teacher,v_program,'2026','A',30,'Classroom'),
          (v_advanced_course,v_current_term,v_teacher,v_program,'2026','A',30,'Classroom'),
          (v_lab_course,v_current_term,v_teacher,v_program,'2026','A',30,'Lab');
  SET v_historical_offering=(SELECT id FROM offerings WHERE course=v_base_course AND term=v_old_term AND section='A');
  SET v_current_offering=(SELECT id FROM offerings WHERE course=v_advanced_course AND term=v_current_term AND section='A');

  SET v_n=0;
  WHILE v_n<=5 DO
    IF v_n=0 THEN
      SET v_student_id=v_student;
    ELSE
      INSERT IGNORE INTO users(email,name,role,password_hash,active)
        VALUES(CONCAT('history',v_n,'@campus.test'),CONCAT('Demo graduate ',v_n),'STUDENT',v_hash,0);
      SET v_student_id=(SELECT id FROM users WHERE email=CONCAT('history',v_n,'@campus.test'));
      INSERT IGNORE INTO students(user_id,student_no,program_id,batch,status)
        VALUES(v_student_id,CONCAT('LAB-H',v_n),v_program,'2025','GRADUATED');
    END IF;
    INSERT IGNORE INTO registrations(student,offering,status)
      VALUES(v_student_id,v_historical_offering,'Approved');
    SET v_reg=(SELECT id FROM registrations WHERE student=v_student_id AND offering=v_historical_offering);
    INSERT IGNORE INTO results(reg,assessment,exam,published)
      VALUES(v_reg,IF(v_n=0,82,30+v_n*10),IF(v_n=0,78,31+v_n*11),1);
    SET v_j=0;
    WHILE v_j<5 DO
      INSERT IGNORE INTO attendance(reg,day,present)
        VALUES(v_reg,DATE_SUB(CURRENT_DATE,INTERVAL (95+v_j) DAY),IF(v_n=0 OR v_j<v_n,1,0));
      SET v_j=v_j+1;
    END WHILE;
    SET v_n=v_n+1;
  END WHILE;

  INSERT IGNORE INTO registrations(student,offering,status)
    VALUES(v_student,v_current_offering,'Approved');
  SET v_reg=(SELECT id FROM registrations WHERE student=v_student AND offering=v_current_offering);
  SET v_j=0;
  WHILE v_j<3 DO
    INSERT IGNORE INTO attendance(reg,day,present)
      VALUES(v_reg,DATE_SUB(CURRENT_DATE,INTERVAL v_j DAY),IF(v_j=1,0,1));
    SET v_j=v_j+1;
  END WHILE;
  INSERT IGNORE INTO results(reg,assessment,exam,published) VALUES(v_reg,62,0,0);

  INSERT IGNORE INTO invoices(student,label,amount,due)
    VALUES(v_student,'Semester tuition · demo',12000,DATE_ADD(CURRENT_DATE,INTERVAL 20 DAY));
  SET v_bill=(SELECT id FROM invoices WHERE student=v_student AND label='Semester tuition · demo');
  INSERT IGNORE INTO receipts(invoice,amount,kind,reference)
    VALUES(v_bill,3000,'Payment','DEMO-001');
  INSERT IGNORE INTO books(code,title,author,copies)
    VALUES('LIB-001','Database System Concepts','Silberschatz, Korth and Sudarshan',3);
  INSERT IGNORE INTO rooms(name,capacity,kind) VALUES
    ('Lecture Hall A',50,'Classroom'),('Computing Lab',32,'Lab');
  INSERT IGNORE INTO notices(title,body,audience,author)
    VALUES('Registration is open','Request an eligible section in Campus services → Registration. Your advisor can review it.','All',v_admin);
  INSERT IGNORE INTO audit_logs(actor_id,action,resource,record_id)
    VALUES(v_admin,'DEMO_WORKSPACE_SEED','demo',v_student);

  SET v_i=1;
  WHILE v_i<=30 DO
    SET v_code=CONCAT('U',LPAD(v_i,2,'0'));
    SET v_batch=CAST(1994+v_i AS CHAR);
    SET v_year_num=1994+v_i;
    SET v_subject=CASE v_i
      WHEN 1 THEN 'Computing' WHEN 2 THEN 'Electrical Engineering'
      WHEN 3 THEN 'Business' WHEN 4 THEN 'Mathematics' WHEN 5 THEN 'Physics'
      WHEN 6 THEN 'Chemistry' WHEN 7 THEN 'English' WHEN 8 THEN 'Economics'
      WHEN 9 THEN 'Architecture' WHEN 10 THEN 'Civil Engineering'
      WHEN 11 THEN 'Statistics' WHEN 12 THEN 'Mechanical Engineering'
      WHEN 13 THEN 'Sociology' WHEN 14 THEN 'Geography' WHEN 15 THEN 'Pharmacy'
      WHEN 16 THEN 'Biotechnology' WHEN 17 THEN 'History'
      WHEN 18 THEN 'Environmental Science' WHEN 19 THEN 'Public Administration'
      WHEN 20 THEN 'Finance' WHEN 21 THEN 'Accounting' WHEN 22 THEN 'Marketing'
      WHEN 23 THEN 'Law' WHEN 24 THEN 'Education' WHEN 25 THEN 'Journalism'
      WHEN 26 THEN 'Fine Arts' WHEN 27 THEN 'Anthropology' WHEN 28 THEN 'Oceanography'
      WHEN 29 THEN 'Geology' ELSE 'Urban Planning' END;
    SET v_first=ELT(MOD(v_i-1,10)+1,'Amina','Rafi','Nabila','Sami','Tasnim','Arif','Ishrat','Farhan','Nadia','Fahim');
    SET v_surname=ELT(FLOOR((v_i-1)/10)+1,'Rahman','Hasan','Karim');

    INSERT IGNORE INTO users(email,name,role,password_hash)
      SELECT CONCAT(LOWER(r.role_name),LPAD(v_i,2,'0'),'@demo.campus.test'),
        CONCAT(v_first,' ',v_surname,' · ',REPLACE(LOWER(r.role_name),'_',' ')),
        r.role_name,v_hash
      FROM (SELECT 'ADMIN' role_name UNION ALL SELECT 'STUDENT' UNION ALL
        SELECT 'TEACHER' UNION ALL SELECT 'ADVISOR' UNION ALL
        SELECT 'THESIS_SUPERVISOR' UNION ALL SELECT 'ACCOUNTS_OFFICER' UNION ALL
        SELECT 'LIBRARIAN') r;

    SET v_admin=(SELECT id FROM users WHERE email=CONCAT('admin',LPAD(v_i,2,'0'),'@demo.campus.test'));
    SET v_student_id=(SELECT id FROM users WHERE email=CONCAT('student',LPAD(v_i,2,'0'),'@demo.campus.test'));
    SET v_teacher_id=(SELECT id FROM users WHERE email=CONCAT('teacher',LPAD(v_i,2,'0'),'@demo.campus.test'));
    SET v_advisor_id=(SELECT id FROM users WHERE email=CONCAT('advisor',LPAD(v_i,2,'0'),'@demo.campus.test'));
    SET v_supervisor_id=(SELECT id FROM users WHERE email=CONCAT('thesis_supervisor',LPAD(v_i,2,'0'),'@demo.campus.test'));
    SET v_accounts=(SELECT id FROM users WHERE email=CONCAT('accounts_officer',LPAD(v_i,2,'0'),'@demo.campus.test'));

    INSERT IGNORE INTO departments(code,name) VALUES(v_code,v_subject);
    SET v_dept=(SELECT id FROM departments WHERE code=v_code);
    INSERT IGNORE INTO programs(code,name,department_id,credits)
      VALUES(CONCAT('P',LPAD(v_i,2,'0')),CONCAT('Bachelor of ',v_subject),v_dept,120+MOD(v_i-1,5)*6);
    SET v_program=(SELECT id FROM programs WHERE code=CONCAT('P',LPAD(v_i,2,'0')));
    INSERT IGNORE INTO academic_years(code,name,starts_on,ends_on)
      VALUES(CONCAT('H',v_year_num),CONCAT('Academic year ',v_year_num),STR_TO_DATE(CONCAT(v_year_num,'-01-01'),'%Y-%m-%d'),STR_TO_DATE(CONCAT(v_year_num,'-12-31'),'%Y-%m-%d'));
    SET v_year=(SELECT id FROM academic_years WHERE code=CONCAT('H',v_year_num));
    INSERT IGNORE INTO semesters(code,name,year_id,starts_on,ends_on,opens_on,closes_on,drop_on)
      VALUES(CONCAT('HIST',LPAD(v_i,2,'0')),CONCAT(v_subject,' historical spring ',v_year_num),v_year,
        STR_TO_DATE(CONCAT(v_year_num,'-01-15'),'%Y-%m-%d'),STR_TO_DATE(CONCAT(v_year_num,'-06-10'),'%Y-%m-%d'),
        STR_TO_DATE(CONCAT(v_year_num,'-01-01'),'%Y-%m-%d'),STR_TO_DATE(CONCAT(v_year_num,'-01-20'),'%Y-%m-%d'),STR_TO_DATE(CONCAT(v_year_num,'-01-31'),'%Y-%m-%d'));
    SET v_year=(SELECT id FROM semesters WHERE code=CONCAT('HIST',LPAD(v_i,2,'0')));
    INSERT IGNORE INTO courses(code,name,department_id,credits) VALUES
      (CONCAT(v_code,'101'),CONCAT('Foundations of ',v_subject),v_dept,3),
      (CONCAT(v_code,'201'),CONCAT('Applied ',v_subject),v_dept,3);
    SET v_base_course=(SELECT id FROM courses WHERE code=CONCAT(v_code,'101'));
    SET v_advanced_course=(SELECT id FROM courses WHERE code=CONCAT(v_code,'201'));
    INSERT IGNORE INTO prerequisites(course,required_course) VALUES(v_advanced_course,v_base_course);
    INSERT IGNORE INTO students(user_id,student_no,program_id,batch,status)
      VALUES(v_student_id,CONCAT('DEMO-',LPAD(v_i,2,'0')),v_program,v_batch,'ACTIVE');
    INSERT IGNORE INTO student_details(student,admission) VALUES(v_student_id,v_year);
    INSERT IGNORE INTO faculty(user_id,department_id,designation) VALUES
      (v_teacher_id,v_dept,'Lecturer'),(v_advisor_id,v_dept,'Lecturer'),(v_supervisor_id,v_dept,'Lecturer');
    INSERT IGNORE INTO faculty_details(teacher,employee_no) VALUES
      (v_teacher_id,CONCAT('EMP-TEACHER-',LPAD(v_i,2,'0'))),
      (v_advisor_id,CONCAT('EMP-ADVISOR-',LPAD(v_i,2,'0'))),
      (v_supervisor_id,CONCAT('EMP-THESIS_SUPERVISOR-',LPAD(v_i,2,'0')));
    INSERT IGNORE INTO advising(student,advisor) VALUES(v_student_id,v_advisor_id);
    INSERT IGNORE INTO advisor_history(student,advisor,effective,actor)
      VALUES(v_student_id,v_advisor_id,STR_TO_DATE(CONCAT(v_year_num,'-01-02'),'%Y-%m-%d'),v_admin);

    INSERT IGNORE INTO offerings(course,term,teacher,program,batch,section,capacity,kind)
      VALUES(v_base_course,v_year,v_teacher_id,v_program,v_batch,'A',24,'Classroom');
    SET v_historical_offering=(SELECT id FROM offerings WHERE course=v_base_course AND term=v_year AND section='A');
    INSERT IGNORE INTO registrations(student,offering,status) VALUES(v_student_id,v_historical_offering,'Approved');
    SET v_reg=(SELECT id FROM registrations WHERE student=v_student_id AND offering=v_historical_offering);
    INSERT IGNORE INTO class_sessions(offering,day,status,actor)
      VALUES(v_historical_offering,STR_TO_DATE(CONCAT(v_year_num,'-02-01'),'%Y-%m-%d'),'Held',v_teacher_id);
    SET v_session=(SELECT id FROM class_sessions WHERE offering=v_historical_offering AND day=STR_TO_DATE(CONCAT(v_year_num,'-02-01'),'%Y-%m-%d'));
    INSERT IGNORE INTO attendance(reg,day,present) VALUES(v_reg,STR_TO_DATE(CONCAT(v_year_num,'-02-01'),'%Y-%m-%d'),1);
    INSERT IGNORE INTO attendance_notes(session_id,reg,actor,reason,previous_status,new_status)
      VALUES(v_session,v_reg,v_teacher_id,'Signed register verified','Absent','Present');
    INSERT IGNORE INTO assessments(offering,title,category,maximum,weight,due) VALUES
      (v_historical_offering,'Seminar','Seminar',100,40,STR_TO_DATE(CONCAT(v_year_num,'-05-20'),'%Y-%m-%d')),
      (v_historical_offering,'Final examination','Final examination',100,60,STR_TO_DATE(CONCAT(v_year_num,'-05-20'),'%Y-%m-%d'));
    INSERT IGNORE INTO assessment_marks(assessment_id,reg,mark,actor)
      SELECT a.id,v_reg,65+MOD(v_i-1,25),v_teacher_id FROM assessments a
      WHERE a.offering=v_historical_offering AND a.title IN ('Seminar','Final examination');
    INSERT IGNORE INTO results(reg,assessment,exam,published)
      VALUES(v_reg,65+MOD(v_i-1,25),65+MOD(v_i-1,25),1);
    INSERT IGNORE INTO marking_policy(offering,coursework_weight) VALUES(v_historical_offering,40);
    INSERT IGNORE INTO materials(offering,title,url)
      VALUES(v_historical_offering,CONCAT(v_subject,' reading list'),CONCAT('https://example.org/course/',v_code));
    INSERT IGNORE INTO fee_types(label,amount) VALUES(CONCAT(v_subject,' laboratory fee'),500+(v_i-1)*10);
    SET v_fee=(SELECT id FROM fee_types WHERE label=CONCAT(v_subject,' laboratory fee'));
    INSERT IGNORE INTO invoices(student,label,amount,due)
      VALUES(v_student_id,CONCAT(v_subject,' semester tuition'),10000+(v_i-1)*100,STR_TO_DATE(CONCAT(v_year_num,'-03-01'),'%Y-%m-%d'));
    SET v_invoice=(SELECT id FROM invoices WHERE student=v_student_id AND label=CONCAT(v_subject,' semester tuition'));
    INSERT IGNORE INTO receipts(invoice,amount,kind,reference) VALUES
      (v_invoice,3500,'Payment',CONCAT('UNI-Payment-',LPAD(v_i,2,'0'))),
      (v_invoice,500,'Waiver',CONCAT('UNI-Waiver-',LPAD(v_i,2,'0')));
    INSERT IGNORE INTO receipt_details(receipt,state,method,reason,actor,reviewer)
      SELECT r.id,'Valid','Office','Recorded at finance desk',v_accounts,v_admin
      FROM receipts r WHERE r.invoice=v_invoice AND r.reference IN (CONCAT('UNI-Payment-',LPAD(v_i,2,'0')),CONCAT('UNI-Waiver-',LPAD(v_i,2,'0')));

    INSERT IGNORE INTO notices(title,body,audience,target,author)
      VALUES(CONCAT(v_subject,' orientation'),'Programme induction and registration briefing.','Program',v_program,v_admin);
    SET v_notice=(SELECT id FROM notices WHERE title=CONCAT(v_subject,' orientation'));
    INSERT IGNORE INTO notice_details(notice,state,starts,filename,document)
      VALUES(v_notice,'Published',DATE_SUB(CURRENT_DATE,INTERVAL 1 DAY),CONCAT('orientation-',LPAD(v_i,2,'0'),'.pdf'),UNHEX('255044462d312e340a312030206f626a0a3c3c202f54797065202f436174616c6f67202f5061676573203220302052203e3e0a656e646f626a0a322030206f626a0a3c3c202f54797065202f5061676573202f4b696473205b33203020525d202f436f756e742031203e3e0a656e646f626a0a332030206f626a0a3c3c202f54797065202f50616765202f506172656e74203220302052202f4d65646961426f78205b30203020353935203834325d202f5265736f7572636573203c3c202f466f6e74203c3c202f4631203420302052203e3e203e3e202f436f6e74656e7473203520302052203e3e0a656e646f626a0a342030206f626a0a3c3c202f54797065202f466f6e74202f53756274797065202f5479706531202f42617365466f6e74202f48656c766574696361203e3e0a656e646f626a0a352030206f626a0a3c3c202f4c656e677468203630203e3e0a73747265616d0a4254202f463120313420546620343020373630205464202843616d707573204465736b2064656d6f6e7374726174696f6e205044462920546a2045540a656e6473747265616d0a656e646f626a0a787265660a3020360a303030303030303030302036353533352066200a30303030303030303039203030303030206e200a30303030303030303538203030303030206e200a30303030303030313135203030303030206e200a30303030303030323431203030303030206e200a30303030303030333131203030303030206e200a747261696c65720a3c3c202f53697a652036202f526f6f74203120302052203e3e0a7374617274787265660a3432310a2525454f46'));
    INSERT IGNORE INTO notice_reads(notice,reader) VALUES(v_notice,v_student_id);
    INSERT IGNORE INTO books(code,title,author,copies)
      VALUES(CONCAT('REF-',LPAD(v_i,2,'0')),CONCAT('Introduction to ',v_subject),CONCAT(v_first,' Ahmed'),2);
    SET v_book=(SELECT id FROM books WHERE code=CONCAT('REF-',LPAD(v_i,2,'0')));
    INSERT IGNORE INTO loans(book,student,issued,due,returned,fine)
      VALUES(v_book,v_student_id,STR_TO_DATE(CONCAT(v_year_num,'-02-01'),'%Y-%m-%d'),STR_TO_DATE(CONCAT(v_year_num,'-02-15'),'%Y-%m-%d'),STR_TO_DATE(CONCAT(v_year_num,'-02-17'),'%Y-%m-%d'),10);
    SET v_loan=(SELECT id FROM loans WHERE book=v_book AND student=v_student_id ORDER BY id DESC LIMIT 1);
    INSERT IGNORE INTO fine_events(loan,actor,status,amount,reason)
      VALUES(v_loan,(SELECT id FROM users WHERE email=CONCAT('librarian',LPAD(v_i,2,'0'),'@demo.campus.test')),'Paid',10,'Collected at return desk');
    INSERT IGNORE INTO rooms(name,capacity,kind) VALUES(CONCAT('Hall ',LPAD(v_i,2,'0')),35,'Classroom');
    SET v_room=(SELECT id FROM rooms WHERE name=CONCAT('Hall ',LPAD(v_i,2,'0')));
    INSERT IGNORE INTO room_blocks(room,slot,reason) VALUES(v_room,25,'Room maintenance');
    INSERT IGNORE INTO unavailable(teacher,slot) VALUES(v_teacher_id,24);
    INSERT IGNORE INTO timetable(offering,room,slot,published) VALUES(v_historical_offering,v_room,1+MOD(v_i-1,20),1);
    INSERT IGNORE INTO routine_reviews(term,state,actor) VALUES(v_year,'Published',v_admin);

    INSERT IGNORE INTO theses(student,title,proposal,supervisor,status)
      VALUES(v_student_id,CONCAT('Field study in ',v_subject),CONCAT('A supervised study of local applications of ',v_subject,'.'),v_supervisor_id,'Defended');
    SET v_thesis=(SELECT id FROM theses WHERE student=v_student_id);
    INSERT IGNORE INTO thesis_assignments(thesis,supervisor,actor) VALUES(v_thesis,v_supervisor_id,v_admin);
    INSERT IGNORE INTO thesis_updates(thesis,actor,note,filename,document)
      VALUES(v_thesis,v_student_id,'Final revised submission',CONCAT('final-',LPAD(v_i,2,'0'),'.pdf'),UNHEX('255044462d312e340a312030206f626a0a3c3c202f54797065202f436174616c6f67202f5061676573203220302052203e3e0a656e646f626a0a322030206f626a0a3c3c202f54797065202f5061676573202f4b696473205b33203020525d202f436f756e742031203e3e0a656e646f626a0a332030206f626a0a3c3c202f54797065202f50616765202f506172656e74203220302052202f4d65646961426f78205b30203020353935203834325d202f5265736f7572636573203c3c202f466f6e74203c3c202f4631203420302052203e3e203e3e202f436f6e74656e7473203520302052203e3e0a656e646f626a0a342030206f626a0a3c3c202f54797065202f466f6e74202f53756274797065202f5479706531202f42617365466f6e74202f48656c766574696361203e3e0a656e646f626a0a352030206f626a0a3c3c202f4c656e677468203630203e3e0a73747265616d0a4254202f463120313420546620343020373630205464202843616d707573204465736b2064656d6f6e7374726174696f6e205044462920546a2045540a656e6473747265616d0a656e646f626a0a787265660a3020360a303030303030303030302036353533352066200a30303030303030303039203030303030206e200a30303030303030303538203030303030206e200a30303030303030313135203030303030206e200a30303030303030323431203030303030206e200a30303030303030333131203030303030206e200a747261696c65720a3c3c202f53697a652036202f526f6f74203120302052203e3e0a7374617274787265660a3432310a2525454f46'));
    SET v_submission=(SELECT id FROM thesis_updates WHERE thesis=v_thesis ORDER BY id DESC LIMIT 1);
    INSERT IGNORE INTO thesis_feedback(submission,actor,note)
      VALUES(v_submission,v_supervisor_id,'Methods and revisions approved.');
    INSERT IGNORE INTO thesis_vivas(thesis,day,room,outcome)
      VALUES(v_thesis,STR_TO_DATE(CONCAT(v_year_num,'-06-05'),'%Y-%m-%d'),CONCAT('Hall ',LPAD(v_i,2,'0')),'Passed');
    INSERT IGNORE INTO notifications(recipient,message)
      VALUES(v_student_id,CONCAT(v_subject,' result published.'));
    INSERT IGNORE INTO audit_logs(actor_id,action,resource,record_id)
      VALUES(v_teacher_id,'RESULT_PUBLISHED','results',v_reg);
    SET v_audit=LAST_INSERT_ID();
    INSERT IGNORE INTO event_details(audit_id,reason,change_data)
      VALUES(v_audit,'Demo publication','Published');

    SET v_i=v_i+1;
  END WHILE;

  INSERT IGNORE INTO program_rules(program)
    SELECT id FROM programs;
  INSERT IGNORE INTO grade_bands(program,minimum,letter,points)
    SELECT p.id,b.minimum,b.letter,b.points
    FROM programs p CROSS JOIN (
      SELECT 80 minimum,'A+' letter,4.00 points UNION ALL
      SELECT 75,'A',3.75 UNION ALL SELECT 70,'A-',3.50 UNION ALL
      SELECT 65,'B+',3.25 UNION ALL SELECT 60,'B',3.00 UNION ALL
      SELECT 55,'B-',2.75 UNION ALL SELECT 50,'C+',2.50 UNION ALL
      SELECT 45,'C',2.25 UNION ALL SELECT 40,'D',2.00 UNION ALL
      SELECT 0,'F',0.00
    ) b;
  INSERT IGNORE INTO class_sessions(offering,day,status)
    SELECT DISTINCT r.offering,a.day,'Held'
    FROM attendance a JOIN registrations r ON r.id=a.reg;
  INSERT IGNORE INTO receipt_details(receipt,state,method)
    SELECT id,'Valid','Recorded' FROM receipts;
  INSERT IGNORE INTO student_profiles(student) SELECT user_id FROM students;
  INSERT IGNORE INTO notification_preferences(user_id) SELECT id FROM users;
  INSERT INTO career_opportunities(title,organization,opportunity_type,description,location,deadline,status,created_by)
    SELECT 'Campus software engineering internship','Campus Innovation Lab','Internship',
      'A fictional supervised internship for students interested in building university services.','Dhaka',DATE_ADD(CURRENT_DATE,INTERVAL 60 DAY),'Published',u.id
    FROM users u WHERE u.email='admin@campus.test'
      AND NOT EXISTS(SELECT 1 FROM career_opportunities WHERE title='Campus software engineering internship' AND organization='Campus Innovation Lab');
  INSERT IGNORE INTO exam_schedules(offering,title,exam_type,exam_date,starts_at,ends_at,room,state,created_by)
    SELECT o.id,'Algorithms final examination','Final',DATE_ADD(s.ends_on,INTERVAL 2 DAY),'09:00:00','12:00:00',rm.id,'Published',admin.id
    FROM offerings o JOIN courses c ON c.id=o.course JOIN semesters s ON s.id=o.term
    JOIN rooms rm ON rm.name='Lecture Hall A' JOIN users admin ON admin.email='admin@campus.test'
    WHERE c.code='CSE201' AND s.code='LAB-2';
  INSERT INTO student_document_requests(student,document_type,purpose)
    SELECT u.id,'Enrollment certificate','Demo request for the current semester.' FROM users u
    WHERE u.email='student@campus.test' AND NOT EXISTS(
      SELECT 1 FROM student_document_requests r WHERE r.student=u.id AND r.document_type='Enrollment certificate' AND r.purpose='Demo request for the current semester.');
  INSERT INTO support_tickets(student,category,subject,description)
    SELECT u.id,'Technical','Demo portal support request','Use this fictional ticket to review the student support workflow.' FROM users u
    WHERE u.email='student@campus.test' AND NOT EXISTS(
      SELECT 1 FROM support_tickets t WHERE t.student=u.id AND t.subject='Demo portal support request');
  INSERT IGNORE INTO invoice_items(invoice,label,amount)
    SELECT i.id,i.label,i.amount FROM invoices i
    WHERE NOT EXISTS (SELECT 1 FROM invoice_items x WHERE x.invoice=i.id);
  INSERT IGNORE INTO section_details(offering,status)
    SELECT id,'Active' FROM offerings;

  INSERT IGNORE INTO book_copies(book,accession)
    SELECT b.id,CONCAT('BK-',b.id,'-',n.copy_no)
    FROM books b CROSS JOIN (
      SELECT 1 copy_no UNION ALL SELECT 2 UNION ALL SELECT 3
    ) n WHERE n.copy_no<=b.copies;
  INSERT IGNORE INTO authors(name)
    SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(b.author,' and ',','),',',n.part),',',-1))
    FROM books b JOIN (SELECT 1 part UNION ALL SELECT 2 UNION ALL SELECT 3) n
      ON n.part<=1+LENGTH(REPLACE(b.author,' and ',','))-LENGTH(REPLACE(REPLACE(b.author,' and ',','),',',''));
  INSERT IGNORE INTO book_authors(book,author)
    SELECT b.id,a.id
    FROM books b JOIN (SELECT 1 part UNION ALL SELECT 2 UNION ALL SELECT 3) n
      ON n.part<=1+LENGTH(REPLACE(b.author,' and ',','))-LENGTH(REPLACE(REPLACE(b.author,' and ',','),',',''))
    JOIN authors a ON a.name=TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(b.author,' and ',','),',',n.part),',',-1));
  INSERT IGNORE INTO loan_copies(loan,copy_id)
    SELECT l.id,(SELECT MIN(c.id) FROM book_copies c WHERE c.book=l.book)
    FROM loans l WHERE NOT EXISTS (SELECT 1 FROM loan_copies x WHERE x.loan=l.id);
  INSERT IGNORE INTO invoice_details(invoice,issued)
    SELECT id,due FROM invoices;

  INSERT IGNORE INTO book_editions(book,isbn,category,edition,publisher,published_year)
    SELECT b.id,NULL,c.name,'1st','Campus Press',YEAR(s.starts_on)
    FROM offerings o JOIN courses c ON c.id=o.course JOIN semesters s ON s.id=o.term
    JOIN departments d ON d.id=c.department_id JOIN books b ON b.code=CONCAT('REF-',RIGHT(d.code,2))
    WHERE c.code LIKE 'U__101';
  INSERT IGNORE INTO room_details(room,code,building,department,active)
    SELECT r.id,CONCAT('H-',RIGHT(d.code,2)),CONCAT('Academic building ',CEIL(CAST(RIGHT(d.code,2) AS UNSIGNED)/5)),d.id,1
    FROM offerings o JOIN courses c ON c.id=o.course JOIN departments d ON d.id=c.department_id
    JOIN rooms r ON r.name=CONCAT('Hall ',RIGHT(d.code,2)) WHERE c.code LIKE 'U__101';
  INSERT IGNORE INTO fee_rules(fee,program,term,category,active)
    SELECT f.id,o.program,o.term,'Laboratory',1
    FROM offerings o JOIN courses c ON c.id=o.course JOIN departments d ON d.id=c.department_id
    JOIN fee_types f ON f.label=CONCAT(d.name,' laboratory fee') WHERE c.code LIKE 'U__101';
  INSERT IGNORE INTO course_descriptions(course,description)
    SELECT c.id,CONCAT(c.name,' introduces core methods and practical applications.')
    FROM offerings o JOIN courses c ON c.id=o.course WHERE c.code LIKE 'U__101';
  INSERT IGNORE INTO prerequisite_grades(course,required_course,minimum)
    SELECT p.course,p.required_course,2 FROM prerequisites p
    JOIN courses c ON c.id=p.course WHERE c.code LIKE 'U__201';
  INSERT IGNORE INTO attendance_status(reg,day,status,actor)
    SELECT a.reg,a.day,IF(a.present=1,'Present','Absent'),o.teacher
    FROM attendance a JOIN registrations r ON r.id=a.reg
    JOIN offerings o ON o.id=r.offering;

  SET v_i=1;
  WHILE v_i<=30 DO
    SET v_weekday=IF(v_i<=25,ELT(FLOOR((v_i-1)/5)+1,'Sun','Mon','Tue','Wed','Thu'),ELT(v_i-25,'Sun','Mon','Tue','Wed','Thu'));
    SET v_j=IF(v_i<=25,MOD(v_i-1,5)+1,6);
    SET v_start=ELT(v_j,'09:00:00','10:30:00','12:00:00','14:00:00','15:30:00','17:00:00');
    SET v_end=ELT(v_j,'10:30:00','12:00:00','13:30:00','15:30:00','17:00:00','18:30:00');
    INSERT IGNORE INTO time_slots(id,weekday,start_time,end_time) VALUES(v_i,v_weekday,v_start,v_end);
    SET v_i=v_i+1;
  END WHILE;

  INSERT IGNORE INTO authors(name)
    SELECT CONCAT(d.name,' Editorial Board') FROM books b
    JOIN departments d ON d.code=CONCAT('U',RIGHT(b.code,2)) WHERE b.code LIKE 'REF-%';
  INSERT IGNORE INTO book_authors(book,author)
    SELECT b.id,a.id FROM books b JOIN departments d ON d.code=CONCAT('U',RIGHT(b.code,2))
    JOIN authors a ON a.name=CONCAT(d.name,' Editorial Board') WHERE b.code LIKE 'REF-%';
  INSERT IGNORE INTO registration_events(reg,actor,state,comment_text)
    SELECT r.id,a.advisor,r.status,'Advising completed' FROM registrations r
    JOIN advising a ON a.student=r.student JOIN users u ON u.id=r.student
    WHERE u.email LIKE '%@demo.campus.test';
  INSERT IGNORE INTO thesis_events(thesis,actor,state,note)
    SELECT t.id,t.supervisor,t.status,'Defense recorded' FROM theses t
    JOIN users u ON u.id=t.student WHERE u.email LIKE '%@demo.campus.test';
  INSERT IGNORE INTO routine_conflicts(term,actor,reason)
    SELECT rv.term,rv.actor,'Historical demo: room maintenance required a different slot before publication.'
    FROM routine_reviews rv JOIN semesters s ON s.id=rv.term WHERE s.code LIKE 'HIST%';
  UPDATE invoice_details d
    JOIN invoices i ON i.id=d.invoice
    JOIN registrations r ON r.student=i.student
    JOIN offerings o ON o.id=r.offering
    JOIN users u ON u.id=i.student
    JOIN semesters s ON s.id=o.term
    SET d.term=o.term,d.issued=s.starts_on
    WHERE u.email LIKE '%@demo.campus.test';
  INSERT IGNORE INTO grade_publications(reg,letter,points,mark,state)
    SELECT g.reg,b.letter,b.points,g.mark,'Locked'
    FROM (
      SELECT r.reg,o.program,ROUND((r.assessment*COALESCE(mp.coursework_weight,40)+r.exam*(100-COALESCE(mp.coursework_weight,40)))/100,2) mark
      FROM results r JOIN registrations e ON e.id=r.reg JOIN offerings o ON o.id=e.offering
      LEFT JOIN marking_policy mp ON mp.offering=o.id WHERE r.published=1
    ) g JOIN grade_bands b ON b.program=g.program
      AND b.minimum=(SELECT MAX(k.minimum) FROM grade_bands k WHERE k.program=g.program AND k.minimum<=g.mark);

  INSERT IGNORE INTO release_seeds(version) VALUES('catalog-details-1'),('histories-1');
  SET v_admin=(SELECT id FROM users WHERE email='admin@campus.test');
  INSERT IGNORE INTO audit_logs(actor_id,action,resource,record_id)
    VALUES(v_admin,'SEED_THIRTY_V1','demo',v_admin);
  COMMIT;
END seed_main$$
DELIMITER ;

CALL seed_campus_desk();
DROP PROCEDURE seed_campus_desk;

