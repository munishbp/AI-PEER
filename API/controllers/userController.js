const userService = require("../services/firestore-functions");

/*controller layer i want a function for register, read, update, and delete

Each function should have try catch, parse request, check format input, and validate token/UID*/



//add user and return their id
exports.registerUser = async (req, res) => {
  try {
    const data = req.body;

    const result = await userService.registerUser(data);

    res.status(201).json({
      message: "User created successfully",
      id: result.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

//update user and return status
exports.updateUser = async (req, res) => {
  try {
    const data = req.body; 

    const result = await userService.updateUser(data.id,data);

    res.status(200).json({
      message: "User updated successfully",
      // user: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

//delete user with firebase id and return status
exports.deleteUser = async (req, res) => {
  try {
    const data = req.body;

    const result = await userService.deleteUser(data.id);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

//this is for login or anytime we want the users info
//still need to add the google identity token check
//request should contain user id for now but later google idendity should occur first before we get the id.
//response is user info 
exports.getUser = async (req, res) => {
  try {
    const data = req.body;

    const result = await userService.readId(data.id);

    res.status(200).json({
      message: "User retrieved successfully",
      user: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
