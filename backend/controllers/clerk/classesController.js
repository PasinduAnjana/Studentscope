const clerkService = require("../../services/clerkService");

exports.getClasses = async (req, res) => {
  try {
    const classes = await clerkService.getAllClasses();

    const json = JSON.stringify(classes);

    console.log(json);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  } catch (err) {
    console.error("Error fetching classes:", err);

    const errorJson = JSON.stringify({ error: "Internal Server Error" });

    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};
