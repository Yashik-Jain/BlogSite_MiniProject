const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser"); // <-- Add this line
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const upload = require("./config/multerconfig")
const path = require("path");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));




app.get("/", (req, res) => {
  res.render("index");
});


app.get("/profile/profileupload", (req, res) => {
  res.render("profileupload");
});

app.post("/upload",isloggedin,upload.single("image"),async (req,res)=>{
let user =await userModel.findOne({email:req.user.email});
// console.log(req.file);
user.profilepic = req.file.filename;
await user.save();
res.redirect("/profile");
})

app.post("/register", async (req, res) => {
  let { username, name, age, email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("User already exists");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        username,
        name,
        age,
        email,
        password: hash,
      });

      let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token", token);
      res.send("Registered successfully");
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(500).send("Something Went Wrong");

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else {
      res.status(500).send("Invalid credentials").redirect("/login");
    }
  });
});

app.get("/profile", isloggedin, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate("posts");
  // console.log(user)
  res.render("profile", { user });
});


app.get("/like/:id", isloggedin, async (req, res) => {
  let post = await postModel.findOne({ _id:req.params.id }).populate("user");
  if(post.likes.indexOf(req.user.userid)===-1) {
    post.likes.push(req.user.userid)
  }
  else {
    post.likes.splice(post.likes.indexOf(req.user.userid),1);
  }
  // console.log(user)
  await post.save();

  res.redirect("/profile");
});


app.get("/edit/:id", isloggedin, async (req, res) => {
  let post = await postModel.findOne({ _id:req.params.id }).populate("user");
  

res.render("edit",{post});

});

app.post("/update/:id",async (req,res)=>{

  let post = await postModel.findOneAndUpdate({ _id:req.params.id },{content : req.body.newcontent});
  res.redirect("/profile");

})



app.post("/post", isloggedin, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    user: user._id,
    content: content,
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});
// function isloggedin(req,res,next){
//     if(req.cookies.token==="") {
//       return res.send("you must be logged in..")
//     }
//         else {
//     let data=jwt.verify(req.cookies.token,"shhhh");
//     req.user = data;
//     next();
// }
// }

function isloggedin(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    // console.log("You Need To be Login..")
    return res.redirect("/login");
  }
  try {
    const data = jwt.verify(token, "shhhh");
    req.user = data;
    next();
  } catch (err) {
    return res.send("Invalid or expired token. Please log in again.");
  }
}

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
