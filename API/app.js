const express = require("express");
const app = express();
//setup express and load routes
const userRoutes = require("./routes/userRoutes");

app.use(express.json());

// Routes
app.use("/users", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
