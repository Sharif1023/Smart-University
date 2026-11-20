CREATE TABLE IF NOT EXISTS book_editions (
 book INT PRIMARY KEY, isbn VARCHAR(17) UNIQUE, category VARCHAR(80), edition VARCHAR(40), publisher VARCHAR(120), published_year INT,
 FOREIGN KEY(book) REFERENCES books(id)
);
CREATE TABLE IF NOT EXISTS room_details (
 room INT PRIMARY KEY, code VARCHAR(32) UNIQUE NOT NULL, building VARCHAR(80), department INT, active SMALLINT NOT NULL CHECK (active IN (0, 1)),
 FOREIGN KEY(room) REFERENCES rooms(id), FOREIGN KEY(department) REFERENCES departments(id)
);
CREATE TABLE IF NOT EXISTS fee_rules (
 fee INT PRIMARY KEY, program INT NOT NULL, term INT NOT NULL, category VARCHAR(60) NOT NULL, active SMALLINT NOT NULL CHECK (active IN (0, 1)),
 FOREIGN KEY(fee) REFERENCES fee_types(id), FOREIGN KEY(program) REFERENCES programs(id), FOREIGN KEY(term) REFERENCES semesters(id)
);
CREATE TABLE IF NOT EXISTS course_descriptions (course INT PRIMARY KEY,description TEXT NOT NULL,FOREIGN KEY(course) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS prerequisite_grades (
 course INT NOT NULL,required_course INT NOT NULL, minimum DECIMAL(3,2) NOT NULL,PRIMARY KEY(course,required_course),
 FOREIGN KEY(course,required_course) REFERENCES prerequisites(course,required_course)
);
CREATE TABLE IF NOT EXISTS attendance_status (
 reg INT NOT NULL, day DATE NOT NULL, status VARCHAR(16) NOT NULL,actor INT NOT NULL,
 PRIMARY KEY(reg,day), FOREIGN KEY(reg,day) REFERENCES attendance(reg,day),FOREIGN KEY(actor) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS campus_settings (
 id INT PRIMARY KEY, timezone_name VARCHAR(80) NOT NULL, currency_code VARCHAR(3) NOT NULL, date_locale VARCHAR(30) NOT NULL
);
INSERT INTO campus_settings VALUES(1,'Asia/Dhaka','BDT','en-GB') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS role_permissions (role_name VARCHAR(32) NOT NULL, permission_name VARCHAR(60) NOT NULL, PRIMARY KEY(role_name,permission_name));
CREATE TABLE IF NOT EXISTS release_seeds(version VARCHAR(40) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
