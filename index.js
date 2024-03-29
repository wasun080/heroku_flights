const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const http = require('http');
const PORT = process.env.PORT || 3001;
const nodemailer = require('nodemailer');

app.use(cors());
app.use(express.json());

app.listen(PORT, function () {
    console.log(`server is running ${PORT}`);
})

const db_config = {
    user: "z5KeCgVHZI",
    host: "remotemysql.com",
    password: "xjp591Hsth",
    database: "z5KeCgVHZI",
};

// const db_config = {
//     user: "root",
//     host: "localhost",
//     password: "12345678",
//     database: "flight_information",
// };

var connection = mysql.createPool(db_config);

function handleDisconnect() {
    connection = mysql.createConnection(db_config); // Recreate the connection, since
    // the old one cannot be reused.
    connection.connect(function (err) {              // The server is either down
        if (err) {                                      // or restarting (takes a while sometimes).
            console.log(' Error when connecting to db:', err);
            setTimeout(handleDisconnect, 1000);         // We introduce a delay before attempting to reconnect,
        }                                               // to avoid a hot loop, and to allow our node script to
    });                                             // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('  Database Error', function (err) {
        console.log('db error: ' + err.code, err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                       // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                // server variable configures this)
        }
    });
}

const isnull = function (request) {
    let result = true
    if (request != '') {
        result = false
    }
    return result;
}

app.get("/flights", (req, res) => {
    connection.query("SELECT * FROM flights LIMIT 100", (err, result) => {
        if (err) {
            console.log(err);
        } else {
            res.send(result);
        }
    });
});

app.get("/", function (req, res) {
    res.send(`Weleome !!`);
})

const getDayofWeekfromCarrier = function (request) {
    let queryString = `SELECT carrier,DAYOFWEEK(schedule_date) as day from flights where carrier = '${request.carrier}'`;
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}

const getCarrieres = async function () {
    let queryString = `SELECT DISTINCT carrier FROM flights`
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}

const getAircraftType = function () {
    let queryString = `SELECT DISTINCT aircraft_type FROM flights`
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}

const getDayofWeekfromAircraftType = function (request) {
    let queryString = `SELECT aircraft_type,DAYOFWEEK(schedule_date) as day from flights where aircraft_type = '${request.aircraft_type}'`;
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}

const getAircraftTypeAndCarrieres = function () {
    let queryString = `SELECT carrier, aircraft_type FROM flights GROUP BY aircraft_type,carrier ORDER by carrier`;
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}

const getDayofWeekfromtAircraftTypeAndCarrieres = function (request) {
    let queryString = `select id,carrier,aircraft_type,DAYOFWEEK(schedule_date) as day from flights where carrier ='${request.carrier}' AND aircraft_type = '${request.aircraft_type}'`;
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}

const getWeekdayAndCarrier = function (request) {
    let queryString = `select id,
                              aircraft_type,
                              carrier,
                              schedule_date,DAYOFWEEK(schedule_date) as dayofweek,
                              HOUR(schedule_date) as hour_time from flights where DAYOFWEEK(schedule_date) = ${request} GROUP BY id ORDER by carrier`;
    return new Promise((resolve, reject) => {
        connection.query(queryString,
            (err, result) => {
                return err ? reject(err) : resolve(result);
            }
        );
    });
}


app.post("/searchflight", function (req, res) {
    let requestData = req.body;
    let flight_type = '';
    let from_date = requestData.fromdate;
    let to_date = requestData.todate;
    let carrier = requestData.carrier;
    let flight_no = requestData.flight_no;
    let aircraft_type = requestData.aircraft_type;
    let querystring = `SELECT * FROM flights WHERE `;
    let parameter = ``;

    if (requestData.flight_type == "1") {
        flight_type = `= 'Arrival'`;
    } else if (requestData.flight_type == "2") {
        flight_type = `= 'Departure'`;
    } else {
        flight_type = `is not null`
    }

    if (flight_type != '') {
        parameter += flight_type != "" ? `flight_type ${flight_type}` : '';
    }
    if (from_date != '' && to_date != '') {
        parameter += `${isnull(parameter) ? `` : ` AND `} schedule_date BETWEEN '${from_date} 00:00:00' AND '${to_date} 00:00:00'`;
    }
    if (carrier != '') {
        parameter += `${isnull(parameter) ? `` : ` AND `} carrier = '${carrier}'`;
    }
    if (flight_no != '') {
        parameter += `${isnull(parameter) ? `` : ` AND `} flight_no = '${flight_no}'`;
    }
    if (aircraft_type != '') {
        parameter += `${isnull(parameter) ? `` : ` AND `} aircraft_type = '${aircraft_type}'`;
    }
    querystring += parameter;
    connection.query(querystring,
        (err, result) => {
            if (err) {
                console.log(err);
            } else {
                res.send(result);
            }
        }
    );
})

app.get("/getcarrier", async (req, res) => {
    let ResultforReturn = [];
    let carriers = await getCarrieres();
    if (carriers != null) {
        for (let carrier of carriers) {
            let daysfrom = await getDayofWeekfromCarrier(carrier);
            if (daysfrom != null) {
                let days = daysfrom.map(a => a.day);
                let objData = { "key": carrier.carrier, "Data": days };
                ResultforReturn.push(objData);
            }
        }
    }
    res.send(ResultforReturn);
});

app.get("/getAircraftType", async (req, res) => {
    let ResultforReturn = [];
    let aircrafttypes = await getAircraftType();
    if (aircrafttypes != null) {
        for (let aircrafttype of aircrafttypes) {
            let daysfrom = await getDayofWeekfromAircraftType(aircrafttype);
            if (daysfrom != null) {
                let days = daysfrom.map(a => a.day);
                let objData = { "key": aircrafttype.aircraft_type, "Data": days };
                ResultforReturn.push(objData);
            }
        }
    }
    res.send(ResultforReturn);
});

app.get("/getAircraftTypeAndCarrier", async (req, res) => {
    let ResultforReturn = [];
    let aircrafttypeAndCarrier = await getAircraftTypeAndCarrieres();
    if (aircrafttypeAndCarrier != null) {
        for (let data of aircrafttypeAndCarrier) {
            let daysfrom = await getDayofWeekfromtAircraftTypeAndCarrieres(data);
            if (daysfrom != null) {
                let days = daysfrom.map(a => a.day);
                let objData = { "id": daysfrom[0].id, "carrier": daysfrom[0].carrier, "aircraft_type": daysfrom[0].aircraft_type, "Data": days };
                ResultforReturn.push(objData);
            }
        }
    }
    res.send(ResultforReturn);
});

app.get("/getWeekdayAndCarrier", async (req, res) => {
    let ResultforReturn = [];
    let ResultforReturn2 = [];
    let WeekdayAndCarrier = [1, 2, 3, 4, 5, 6, 7]
    let carrieresfromDB = await getCarrieres();
    if (WeekdayAndCarrier != null) {
        for (let data of WeekdayAndCarrier) {
            let resultfromDb = await getWeekdayAndCarrier(data);
            for (let val of resultfromDb) {
                let objData = {
                    "id": val.id,
                    "aircraft_type": val.aircraft_type,
                    "carrier": val.carrier,
                    "dayofweek": val.dayofweek,
                    "hour_time": val.hour_time
                }
                ResultforReturn.push(objData);
            }
        }
    }
    for (let val of WeekdayAndCarrier) {
        let objData = {};
        objData["DayofWeek"] = val;
        let array = [];
        for (let carrier of carrieresfromDB) {
            let days = {}
            let datafromDb = ResultforReturn.filter(x => x.carrier == carrier.carrier && x.dayofweek == val);
            let times = datafromDb.map(x => x.hour_time)
            days['id'] = `${val}-${carrier.carrier}`
            days['Day'] = val;
            days['Key'] = carrier.carrier;
            days['times'] = times;
            if (times.length > 0) {
                array.push(days);
            }
        }
        objData["Data"] = array;
        ResultforReturn2.push(objData);
    }
    res.send(ResultforReturn2);
});

app.post("/sendemail", async function (req, res) {
    let requestData = req.body;
    try {
        let testAccount = await nodemailer.createTestAccount();

        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'deion.gislason@ethereal.email',
                pass: 'HtagKMuPfVPC7JY8Z5'
            }
        });

        let info = await transporter.sendMail({
            from: '"Fred Foo 👻" <wasun_08@aewshop.com>', // sender address
            to: requestData.email, // list of receivers
            subject: "Hello ✔", // Subject line
            text: "Hello world?", // plain text body
            html: "<b>Hello world?</b>", // html body
        });

        console.log("Message sent: %s", info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

        // Preview only available when sending through an Ethereal account
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

        res.send(info);
    }
    catch (error) {
        console.log(error);
        res.send(error);
    }
})