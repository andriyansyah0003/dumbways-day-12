const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");

const db = require("./connection/db");
const upload = require("./middlewares/uploadFile");

const app = express();
const PORT = 3000;

const isLogin = true;

app.set("view engine", "hbs"); //setup template engine / view engine

app.use("/public", express.static(__dirname + "/public"));
app.use("/uploads", express.static(__dirname + "/uploads"));

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "rahasia",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 2 },
  })
);

app.use(flash());

app.get("/", (req, res) => {
  db.connect(function (err, client, done) {
    if (err) throw err;
    let query = "";

    if (req.session.isLogin == true) {
      query = `SELECT tb_projects.*, tb_user.id as "user_id", tb_user.name, tb_user.email
      FROM tb_projects
      LEFT JOIN tb_user
      ON tb_projects.author_id = tb_user.id 
      WHERE tb_projects.author_id = ${req.session.user.id}
      ORDER BY tb_projects.id DESC`;
    } else {
      query = `SELECT tb_projects.*, tb_user.id as "user_id", tb_user.name, tb_user.email
      FROM tb_projects
      LEFT JOIN tb_user
      ON tb_projects.author_id = tb_user.id
      ORDER BY tb_projects.id DESC`;
    }

    client.query(query, function (err, result) {
      if (err) throw err;

      const projects = result.rows;

      const newProject = projects.map((project) => {
        project.lengthDate = getDateDifference(
          project["start_date"],
          project["end_date"]
        );
        project.isLogin = req.session.isLogin;
        project.name = project.name ? project.name : "-";
        project.image = project.image
          ? "/uploads/" + project.image
          : "/public/img/cover.png";
        return project;
      });

      res.render("index", {
        isLogin: req.session.isLogin,
        user: req.session.user,
        projects: newProject,
      });
    });
    done();
  });
});

app.get("/add-project", (req, res) => {
  if (req.session.isLogin != true) {
    req.flash("warning", "Please Login...");
    return res.redirect("/");
  }

  res.render("add-project");
});

app.post("/add-project", upload.single("image"), (req, res) => {
  const project_name = req.body.project_name;
  const start_date = req.body.startDate;
  const end_date = req.body.endDate;
  const description = req.body.description;
  const technologies = [];
  const userId = req.session.user.id;
  const fileName = req.file.filename;

  if (req.body.nodeJs) {
    technologies.push("nodejs");
  } else {
    technologies.push("");
  }
  if (req.body.reactJs) {
    technologies.push("reactjs");
  } else {
    technologies.push("");
  }
  if (req.body.nextJs) {
    technologies.push("nextJs");
  } else {
    technologies.push("");
  }
  if (req.body.typeScript) {
    technologies.push("typeScript");
  } else {
    technologies.push("");
  }

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `INSERT INTO tb_projects(project_name,start_date, end_date,description, author_id,technologies, image) 
                    VALUES('${project_name}','${start_date}', '${end_date}','${description}',${userId},ARRAY ['${technologies[0]}','${technologies[1]}','${technologies[2]}','${technologies[3]}'], '${fileName}');`;

    client.query(query, function (err, result) {
      if (err) throw err;

      res.redirect("/");
    });
    done();
  });
});

app.get("/project-detail/:id", (req, res) => {
  const id = req.params.id;

  db.connect(function (err, client, done) {
    if (err) throw err;
    const query = `SELECT tb_projects.*, tb_user.id as "user_id", tb_user.name, tb_user.email
                    FROM tb_projects
                    LEFT JOIN tb_user
                    ON tb_projects.author_id = tb_user.id
                    WHERE tb_projects.id = ${id}`;

    client.query(query, function (err, result) {
      if (err) throw err;

      const project = result.rows[0];

      project.lengthDate = getDateDifference(
        project["start_date"],
        project["end_date"]
      );
      project["start_date"] = converTime(project["start_date"]);
      project["end_date"] = converTime(project["end_date"]);

      res.render("project-detail", { project });
    });
    done();
  });
});

app.get("/edit-project/:id", (req, res) => {
  const id = req.params.id;

  db.connect(function (err, client, done) {
    if (req.session.isLogin != true) {
      req.flash("warning", "Please Login...");
      return res.redirect("/");
    }

    if (err) throw err;
    const query = `SELECT * FROM tb_projects WHERE id = ${id}`;

    client.query(query, function (err, result) {
      if (err) throw err;

      const project = result.rows[0];
      project.image = project.image
        ? "/uploads/" + project.image
        : "/public/img/cover.jpg";

      res.render("edit-project", {
        project,
        id,
        isLogin: req.session.isLogin,
        user: req.session.user,
      });
    });
    done();
  });
});

app.post("/edit-project/:id", upload.single("image"), (req, res) => {
  id = req.params.id;
  const project_name = req.body.project_name;
  const start_date = req.body.startDate;
  const end_date = req.body.endDate;
  const description = req.body.description;
  const technologies = [];

  if (req.body.nodeJs) {
    technologies.push("nodeJs");
  } else {
    technologies.push("");
  }
  if (req.body.reactJs) {
    technologies.push("reactJs");
  } else {
    technologies.push("");
  }
  if (req.body.nextJs) {
    technologies.push("nextJs");
  } else {
    technologies.push("");
  }
  if (req.body.typeScript) {
    technologies.push("typeScript");
  } else {
    technologies.push("");
  }

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `UPDATE tb_projects SET project_name='${project_name}',start_date='${start_date}',end_date='${end_date}',description='${description}',technologies=ARRAY ['${technologies[0]}','${technologies[1]}','${technologies[2]}','${technologies[3]}'] WHERE id='${id}';`;

    client.query(query, function (err, result) {
      if (err) throw err;

      res.redirect("/");
    });

    done();
  });
});

app.get("/delete-project/:id", (req, res) => {
  const id = req.params.id;

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `DELETE FROM tb_projects WHERE id = ${id};`;

    client.query(query, function (err, result) {
      if (err) throw err;
      res.redirect("/");
    });
    done();
  });
});

app.get("/contact", (req, res) => {
  res.render("contact");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  let password = req.body.password;

  password = bcrypt.hashSync(password, 10);

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `INSERT INTO tb_user(name,email,password) 
                    VALUES('${name}','${email}','${password}');`;

    client.query(query, function (err, result) {
      if (err) throw err;

      if (err) {
        res.redirect("/register");
      } else {
        req.flash("success", "Register <b>success</b>, please login ...");
        res.redirect("/login");
      }
    });
    done();
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email == "" || password == "") {
    req.flash("warning", "Please insert all fields");
    return res.redirect("/login");
  }

  db.connect(function (err, client, done) {
    if (err) throw err;

    const query = `SELECT * FROM tb_user WHERE email = '${email}';`;

    client.query(query, function (err, result) {
      if (err) throw err;

      const data = result.rows;

      if (data.length == 0) {
        req.flash("error", "Email not found");
        return res.redirect("/login");
      }

      const isMatch = bcrypt.compareSync(password, data[0].password);

      if (isMatch == false) {
        req.flash("error", "Password not match");
        return res.redirect("/login");
      }

      req.session.isLogin = true;
      req.session.user = {
        id: data[0].id,
        email: data[0].email,
        name: data[0].name,
      };

      req.flash("success", `Welcome, <b>${data[0].email}</b>`);

      res.redirect("/");
    });

    done();
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

function getDateDifference(startDate, endDate) {
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const startDateUTC = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endDateUTC = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  day = 1000 * 60 * 60 * 24; // miliseconds in a day
  difference = (endDateUTC - startDateUTC) / day; // difference in days
  return difference < 30
    ? difference + " Days"
    : parseInt(difference / 30) + " Months"; // return difference in months
}

function converTime(time) {
  return new Date(time).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
