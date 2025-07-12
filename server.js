const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./content.json";

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static("public"));

// Helper: Load and save data
function loadData() {
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Register passenger
app.post("/api/passengers", (req, res) => {
  const { name } = req.body;
  const data = loadData();

  if (data.passengers.some(p => p.name === name)) {
    return res.json({ success: false, message: "Passenger already exists." });
  }

  data.passengers.push({
    name,
    assigned: false,
    driver: null,
    time: null,
    location: null,
    comments: null,
    numPeople: null,
    meetLocation: null,
    meetTime: null
  });
  saveData(data);
  res.json({ success: true });
});

// Register driver
app.post("/api/drivers", (req, res) => {
  const { name } = req.body;
  const data = loadData();

  if (data.drivers.some(d => d.name === name)) {
    return res.json({ success: false, message: "Driver already exists." });
  }

  data.drivers.push({ name, passengers: [] });
  saveData(data);
  res.json({ success: true });
});

// ✅ Assign or unassign a passenger instantly
app.put("/api/drivers/:name/passengers", (req, res) => {
  const driverName = req.params.name;
  const { passengerName, assign } = req.body;
  const data = loadData();

  const driver = data.drivers.find(d => d.name === driverName);
  if (!driver) {
    return res.status(404).json({ success: false, message: "Driver not found." });
  }

  const passenger = data.passengers.find(p => p.name === passengerName);
  if (!passenger) {
    return res.status(404).json({ success: false, message: "Passenger not found." });
  }

  if (assign) {
    // Unassign from previous driver
    if (passenger.driver && passenger.driver !== driverName) {
      const oldDriver = data.drivers.find(d => d.name === passenger.driver);
      if (oldDriver) {
        oldDriver.passengers = oldDriver.passengers.filter(p => p !== passengerName);
      }
    }
    // Assign to current driver
    passenger.assigned = true;
    passenger.driver = driverName;
    if (!driver.passengers.includes(passengerName)) {
      driver.passengers.push(passengerName);
    }
  } else {
    // Unassign from current driver
    passenger.assigned = false;
    passenger.driver = null;
    passenger.time = null;
    passenger.location = null;
    passenger.comments = null;
    driver.passengers = driver.passengers.filter(p => p !== passengerName);
  }

  saveData(data);
  res.json({ success: true });
});

// Delete driver
app.delete("/api/drivers/:name", (req, res) => {
  const driverName = req.params.name;
  const data = loadData();

  const driverIndex = data.drivers.findIndex(d => d.name === driverName);
  if (driverIndex === -1) {
    return res.status(404).json({ success: false, message: "Driver not found." });
  }

  // Unassign passengers from this driver
  const passengersToUnassign = data.drivers[driverIndex].passengers;
  passengersToUnassign.forEach(passengerName => {
    const passenger = data.passengers.find(p => p.name === passengerName);
    if (passenger) {
      passenger.assigned = false;
      passenger.driver = null;
      passenger.time = null;
      passenger.location = null;
      passenger.comments = null;
    }
  });

  data.drivers.splice(driverIndex, 1);
  saveData(data);
  res.json({ success: true, message: "Driver account erased." });
});

// Get all data
app.get("/api/data", (req, res) => {
  const data = loadData();
  res.json(data);
});

// Driver sets travel details
app.put("/api/drivers/:name/travel", (req, res) => {
  const driverName = req.params.name;
  const { time, location, comments } = req.body;
  const data = loadData();

  const driver = data.drivers.find(d => d.name === driverName);
  if (!driver) {
    return res.status(404).json({ success: false, message: "Driver not found." });
  }

  driver.passengers.forEach(passengerName => {
    const passenger = data.passengers.find(p => p.name === passengerName);
    if (passenger) {
      passenger.time = time;
      passenger.location = location;
      passenger.comments = comments;
    }
  });

  saveData(data);
  res.json({ success: true, message: "Travel details updated for all assigned passengers." });
});

// Get passenger personal info
app.get("/api/passengers/:name/personal", (req, res) => {
  const passengerName = req.params.name;

  const data = loadData();
  const passenger = data.passengers.find(p => p.name === passengerName);
  if (!passenger) {
    return res.status(404).json({ success: false, message: "Passenger not found." });
  }

  res.json({
    numPeople: passenger.numPeople || null,
    meetLocation: passenger.meetLocation || null,
    meetTime: passenger.meetTime || null
  });
});

// ✅ Save passenger personal info (updated logic)
app.put("/api/passengers/:name/personal", (req, res) => {
  const passengerName = req.params.name;
  const { numPeople, meetLocation, meetTime } = req.body;

  const data = loadData();
  const passenger = data.passengers.find(p => p.name === passengerName);
  if (!passenger) {
    return res.status(404).json({ success: false, message: "Passenger not found." });
  }

  if (typeof numPeople !== "undefined") passenger.numPeople = numPeople;
  if (typeof meetLocation !== "undefined") passenger.meetLocation = meetLocation;
  if (typeof meetTime !== "undefined") passenger.meetTime = meetTime;

  saveData(data);
  res.json({ success: true, message: "Personal info updated." });
});

// Delete passenger
app.delete("/api/passengers/:name", (req, res) => {
  const passengerName = req.params.name;
  const data = loadData();

  const passengerIndex = data.passengers.findIndex(p => p.name === passengerName);
  if (passengerIndex === -1) {
    return res.status(404).json({ success: false, message: "Passenger not found." });
  }

  // Remove passenger from driver
  const passenger = data.passengers[passengerIndex];
  if (passenger.driver) {
    const driver = data.drivers.find(d => d.name === passenger.driver);
    if (driver) {
      driver.passengers = driver.passengers.filter(pName => pName !== passengerName);
    }
  }

  data.passengers.splice(passengerIndex, 1);

  saveData(data);
  res.json({ success: true, message: "Passenger account erased." });
});

// Get passenger travel details
app.get("/api/passengers/:name/travel", (req, res) => {
  const passengerName = req.params.name;
  const data = loadData();

  const passenger = data.passengers.find(p => p.name === passengerName);
  if (!passenger) {
    return res.status(404).json({ success: false, message: "Passenger not found." });
  }

  res.json({
    driver: passenger.driver || null,
    time: passenger.time || null,
    location: passenger.location || null,
    comments: passenger.comments || null
  });
});

// Get trip info
app.get("/api/trip", (req, res) => {
  const data = loadData();
  res.json(data.trip || {});
});

// Update trip info
app.put("/api/trip", (req, res) => {
  const { destination, arrivalTime, date } = req.body;
  const data = loadData();

  data.trip = {
    destination: destination || "",
    arrivalTime: arrivalTime || "",
    date: date || ""
  };

  saveData(data);
  res.json({ success: true, message: "Trip information updated." });
});

// Reset entire trip
app.post("/api/reset", (req, res) => {
  const data = {
    passengers: [],
    drivers: [],
    trip: {}
  };

  saveData(data);
  res.json({ success: true, message: "Trip, passengers, and drivers have been reset." });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
