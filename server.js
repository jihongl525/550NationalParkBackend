const express = require('express');
const mysql      = require('mysql');
var cors = require('cors')
let PORT = process.env.PORT || 8080;

const routes = require('./routes')
const config = require('./config.json')

const app = express();

// whitelist localhost 3000
app.use(cors({ credentials: true, origin: ['http://localhost:3000'] }));

// Route 1 - welcome
app.get('/hello', routes.hello)

// Route 2 - get park details by park name
app.get('/parkdetails', routes.park_details)

// Route 3 - get park by state
app.get('/parksbystate', routes.parks_by_state)

// Route 4 - get park by combination of attributes (name, state, numSpecies)
app.get('/search/parks', routes.search_parks)

// Route 5 - get all parks
app.get('/parks', routes.all_parks)

// Route 6 - get airports by park
app.get('/airports/:parkid', routes.airports_by_park)

// Route 7 - get EV stations by park
app.get('/evstations/:parkid', routes.evstations_by_park)

// Route 8 - get species distribution by category by park
app.get('/species/:parkid', routes.species_categories_by_park)

// Route 9 - get ranked list of common species based on number of appearances in parks
app.get('/speciesnativeness/:parkid', routes.species_nativeness_by_park)

app.listen(PORT, () => {
    console.log(`Server running at http://${config.server_host}:${PORT}/`);
});

app.get("/", (req, res) => {
    res.send("Hello world - successfully connected");
});

module.exports = app;
