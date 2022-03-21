const config = require('./config.json')
const mysql = require('mysql');
const e = require('express');
const https = require('https');
const { url } = require('inspector');

const connection = mysql.createConnection({
    host: config.rds_host,
    user: config.rds_user,
    password: config.rds_password,
    port: config.rds_port,
    database: config.rds_db
});
connection.connect();

const baseUrl = new URL('https://developer.nps.gov/api/v1');
const api_key = 'XyfGexV5dD7h0K4I05ycyNYc9oF5waptcu82RckQ'


// Route 1 - welcome
async function hello(req, res) {
    // a GET request to /hello?name=Steve
    if (req.query.name) {
        res.send(`Hello ${req.query.name}! Welcome to National Parks finder!`)
    } else {
        res.send(`Hello! Welcome to National Parks finder!`)
    }
}


// Route 2 - get details about a park via NPS Data API
// retrieve details about a park, such as name, description, available activities, contacts, and entrance fees.
// e.g. http://localhost:8080/parkdetails/?parkid=acad
async function park_details(req, res) {

    if (req.query.parkid) {
        const urlPath = new URL(baseUrl + "/parks");
        urlPath.searchParams.append('parkCode', req.query.parkid);
        urlPath.searchParams.append('api_key', api_key);
        
        console.log(urlPath)

        https.get(urlPath, (resp) => {
            let data = '';
    
            // called when a data chunk is received.
            resp.on('data', (chunk) => {
                data += chunk;
            });
          
            // called when the complete response is received.
            resp.on('end', () => {
                res.send(JSON.parse(data));
            });
    
        }).on("error", (error) => {
            console.log("Error: " + error.message);
        });
    }
}


// Route 3 - get park by combination of attributes (name, state, numSpecies, numAirports, numEVStations)
// retrieve additional info about a park including the number of species, the number of nearby airports, and the number of nearby EV stations
// e.g. http://localhost:8080/search/parks?state=UT&speciesmorethan=100&parkname=canyon&airportsmorethan=2&evsmorethan=3
async function search_parks(req, res) {
    var state = req.query.state ? req.query.state : "";

    var parkname = req.query.parkname ? req.query.parkname : "";

    var numspecies = req.query.speciesmorethan ? req.query.speciesmorethan : 0;

    var numairports = req.query.airportsmorethan ? req.query.airportsmorethan : -1;

    var numevs = req.query.evsmorethan ? req.query.evsmorethan : -1;

    var pagesize = req.query.pagesize ? req.query.pagesize : 10;

    var offset = pagesize * (req.query.page - 1);

    if (req.query.page && !isNaN(req.query.page)) {
        connection.query(`WITH speciesMoreThan AS (
            SELECT P.Park_Code, P.Park_Name, P.State, COUNT(DISTINCT Scientific_Name) AS numSpecies
            FROM Species S
            JOIN Parks P on S.Park_Code = P.Park_Code
            GROUP BY P.Park_Code, P.Park_Name, P.State
            HAVING COUNT(DISTINCT Scientific_Name) > '${numspecies}' 
        )

        SELECT SMT.Park_Code, SMT.Park_Name, SMT.State, numSpecies, COUNT(DISTINCT AP.Airport_ID) AS numAirports, COUNT(DISTINCT EVP.Station_ID) AS numEVS
        FROM speciesMoreThan SMT
        LEFT JOIN Airports_Near_Parks AP on SMT.Park_Code = AP.Park_Code
        LEFT JOIN Airports A on AP.Airport_ID = A.ID
        LEFT JOIN EV_Stations_Near_Parks EVP on SMT.Park_Code = EVP.Park_Code
        LEFT JOIN EV_Stations EV on EVP.Station_ID = EV.ID
        WHERE SMT.Park_Name LIKE '%${parkname}%'
            AND SMT.State LIKE '%${state}%' 
            AND A.Type IN ('small_airports', 'medium_airport', 'large_airport')
            GROUP BY SMT.Park_Name, SMT.State, numSpecies
            HAVING numAirports > '${numairports}' AND numEVS > '${numevs}' 
        LIMIT ${pagesize}
        OFFSET ${offset}`, function (error, results, fields) {
            if (error) {
                console.log(error)
                res.json({ error: error })
            } else if (results) {
                res.json({ results: results })
            }
        });
    } else {
        connection.query(`WITH speciesMoreThan AS (
            SELECT P.Park_Code, P.Park_Name, P.State, COUNT(DISTINCT Scientific_Name) AS numSpecies
            FROM Species S
            JOIN Parks P on S.Park_Code = P.Park_Code
            GROUP BY P.Park_Code, P.Park_Name, P.State
            HAVING COUNT(DISTINCT Scientific_Name) > '${numspecies}'
        )

        SELECT SMT.Park_Code, SMT.Park_Name, SMT.State, numSpecies, COUNT(DISTINCT AP.Airport_ID) AS numAirports, COUNT(DISTINCT EVP.Station_ID) AS numEVS
        FROM speciesMoreThan SMT
        LEFT JOIN Airports_Near_Parks AP on SMT.Park_Code = AP.Park_Code
        LEFT JOIN Airports A on AP.Airport_ID = A.ID
        LEFT JOIN EV_Stations_Near_Parks EVP on SMT.Park_Code = EVP.Park_Code
        LEFT JOIN EV_Stations EV on EVP.Station_ID = EV.ID
        WHERE SMT.Park_Name LIKE '%${parkname}%'
            AND SMT.State LIKE '%${state}%' 
            AND A.Type IN ('small_airports', 'medium_airport', 'large_airport')
            GROUP BY SMT.Park_Name, SMT.State, numSpecies
            HAVING numAirports > '${numairports}' AND numEVS > '${numevs}'`, function (error, results, fields) {
            if (error) {
                console.log(error)
                res.json({ error: error })
            } else if (results) {
                res.json({ results: results })
            }
        });
    }

}


// Route 4 - get all parks
// retrieve all US national parks
// http://localhost:8080/parks
async function all_parks(req, res) {
    
    req.query.pagesize = req.query.pagesize ? req.query.pagesize : 10

    if (req.query.page && !isNaN(req.query.page)) {
        // This is the case where page is defined.
        connection.query(`SELECT *
        FROM Parks 
        LIMIT ${req.query.pagesize} OFFSET ${(req.query.page - 1) * req.query.pagesize}`, function (error, results, fields) {

            if (error) {
                console.log(error)
                res.json({ error: error })
            } else if (results) {
                res.json({ results: results })
            }
        });
    } else {
        connection.query(`SELECT *  
        FROM Parks`, function (error, results, fields) {

            if (error) {
                console.log(error)
                res.json({ error: error })
            } else if (results) {
                // console.log(results)
                res.json({ results: results })
            }
        });
    }
}


// Route 5 - get airports by park
// retrieve airports that are close to a specific park
// e.g. http://localhost:8080/airports/noca
async function airports_by_park(req, res) {
    if (req.params.parkid) {
        connection.query(`SELECT A.IATA_Code, A.Name, A.Municipality, A.State_Abbr
            FROM Airports_Near_Parks AP 
            JOIN Airports A ON (A.ID = AP.Airport_ID)
            WHERE Park_Code = '${req.params.parkid}'
                AND A.Type IN ('small_airports', 'medium_airport', 'large_airport')`, function (error, results, fields) {
                if (error) {
                    console.log(error)
                    res.json({ error: error })
                } else if (results) {
                    res.json({ results: results })
                }
            });
    } else {
        res.json({"error": "Park ID not specified!"})
    }
}


// Route 6 - get EV stations by park
// retrieve EV stations that are close to a specific park
// e.g. http://localhost:8080/evstations/noca
async function evstations_by_park(req, res) {
    if (req.params.parkid) {
        connection.query(`SELECT EV.Name, EV.Address, EV.City, EV.State, EV.Zip
            FROM EV_Stations_Near_Parks EVP 
            JOIN EV_Stations EV ON (EV.ID = EVP.Station_ID)
            WHERE Park_Code = '${req.params.parkid}'
                AND EV.Access_Type = 'public'`, function (error, results, fields) {
                if (error) {
                    console.log(error)
                    res.json({ error: error })
                } else if (results) {
                    res.json({ results: results })
                }
            });
    } else {
        res.json({"error": "Park ID not specified!"})
    }
}


// Route 7 - get species distribution by category by park
// retrieve the number of species by category for a specific park
// e.g. http://localhost:8080/species/noca
async function species_categories_by_park(req, res) {
    if (req.params.parkid) {
        connection.query(`SELECT Category, COUNT(DISTINCT Scientific_Name) AS numSpecies
            FROM Species
            WHERE Park_Code = '${req.params.parkid}'
            GROUP BY Category`, function (error, results, fields) {
                if (error) {
                    console.log(error)
                    res.json({ error: error })
                } else if (results) {
                    res.json({ results: results })
                }
            });
    } else {
        res.json({"error": "Park ID not specified!"})
    }
}


// Route 8 - get number of Native and Not Native species by park
// retrieve the number of native and non-native species for a specific park
// e.g. http://localhost:8080/speciesnativeness/zion
async function species_nativeness_by_park(req, res) {
    if (req.params.parkid) {
        connection.query(`
        WITH native AS (SELECT Park_Code, COUNT(DISTINCT Scientific_Name) AS numNative FROM Species WHERE Nativeness = 'Native' GROUP BY Park_Code)
        , notNative AS (SELECT Park_Code, COUNT(DISTINCT Scientific_Name) AS numNotNative FROM Species WHERE Nativeness = 'Not Native' GROUP BY Park_Code)
        
        SELECT n.Park_Code, numNative, numNotNative
        FROM native n
        JOIN notNative nn on n.Park_Code = nn.Park_Code
        WHERE n.Park_Code = '${req.params.parkid}'`, function (error, results, fields) {
                if (error) {
                    console.log(error)
                    res.json({ error: error })
                } else if (results) {
                    res.json({ results: results })
                }
            });
    } else {
        res.json({"error": "Park ID not specified!"})
    }
}

module.exports = {
    hello,
    all_parks,
    park_details,
    search_parks,
    airports_by_park,
    evstations_by_park,
    species_categories_by_park,
    species_nativeness_by_park
}