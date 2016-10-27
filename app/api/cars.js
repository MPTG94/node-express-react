var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var validate = require('validate.js');
var connection = require('../db/dbConnection');
var constraints = require('../db/validators/carValidators');

// Create whitelist object for validation
var whitelist = {
  Name: true,
  Trim: true,
  HorsePower: true,
  CompanyID: true
};

// Create parsers
// create application/json parser
var jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({
  extended: true
});

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

// define the basic get route
// This call will return all rows from the DB
router.get('/', function(req, res) {
  connection.query('SELECT * FROM cardb.cars', function(err, rows, fields) {
    if (err) {
      throw err;
    } else {
      res.status(200).json(rows);
    }
  });
});

// define route to get single item by id
// This call will return a single row by it's ID from the DB
router.get('/:ID', function(req, res) {
  var params = req.params;
  console.log(params);
  connection.query('SELECT * FROM cardb.cars WHERE ID = ?',
    params.ID,
    function(err, rows, fields) {
      if (err) {
        throw err;
      } else {
        res.status(200).json(rows);
      }
    });
});

// define route to edit single item by id
// This call will update a single row by it's ID from the DB
router.put('/:ID', jsonParser, function(req, res) {
  var result = {};
  if (!req.body) {
    // No body in request, returning 400 status code
    result.Error = "No body in request";
    res.status(400).json(result);
  }
  var params = req.params;
  var car = req.body;
  console.log(`ID: ${params.ID}`);
  car = validate.cleanAttributes(car, whitelist);
  if (Object.keys(car).length === 0) {
    result.Error = "Sent data is not valid";
    res.status(400).json(result);
  } else if (validate(car, constraints.updatedCarConst) === undefined) {
    // Object is valid
    var query = connection.query(`UPDATE cardb.cars SET ? WHERE ID = ?`,
      [car, params.ID],
      function(err, result) {
        if (err) {
          throw err;
        } else {
          connection.query('SELECT * FROM cardb.cars WHERE ID = ?',
            params.ID,
            function(err, rows, fields) {
              if (err) {
                throw err;
              } else {
                console.log(result.affectedRows);
                res.status(200).json(rows);
              }
            });
        }
      });
    console.log(`QUERY: ${query.sql}`);
  } else {
    // Object is not valid
    res.status(200).json(validate(car, constraints.updatedCarConst));
  }
});

// define route to delete single item by id
// This call will delete a single row by it's ID from the DB
router.delete('/:ID', jsonParser, function(req, res) {
  var result = {};
  if (!req.body) {
    // No body in request, returning 400 status code
    result.Error = "No body in request";
    res.status(400).json(result);
  }
  var params = req.params;
  var car = req.body;
  console.log(`ID: ${params.ID}`);
  console.log(`ID From Body: ${car.ID}`);
  car = validate.cleanAttributes(car, {
    ID: true
  });
  console.log(`validated`);
  if (validate(car, constraints.deleteCarConst) === undefined) {
    // Object is valid
    if (parseInt(car.ID, 10) === parseInt(params.ID, 10)) {
      console.log(`IDS MATCH`);
      var query = connection.query(`DELETE FROM cardb.cars WHERE ID = ?`,
        params.ID,
        function(err, result) {
          if (err) {
            throw err;
          } else {
            result.Message = "Object deleted successfuly";
            res.json(result);
          }
        });
      console.log(`QUERY: ${query.sql}`);
    } else {
      // Request body ID doesn't match request URL parameter ID, not deleting
      result.Error = "Request body ID doesn't match " +
        "request URL parameters ID, not deleting";
      return res.status(400).json(result);
    }
  } else {
    // Object is not valid
    res.status(400).json(validate(car, constraints.deleteCarConst));
  }
});

// define the create new car route
// This call will create a new row in the DB
router.post('/', jsonParser, function(req, res) {
  var result = {};
  if (!req.body) {
    // No body in request, returning 400 status code
    result.Error = "No body in request";
    res.status(400).json(result);
  }
  var car = req.body;
  car = validate.cleanAttributes(car, whitelist);
  console.log(validate(car, constraints.newCarConst));
  if (validate(car, constraints.newCarConst) === undefined) {
    // Object is valid
    var query = connection.query(`INSERT INTO cardb.cars SET ?`, car,
      function(err, result) {
        if (err) {
          throw err;
        } else {
          connection.query('SELECT * FROM cardb.cars WHERE ID = ?',
            result.insertId,
            function(err, rows, fields) {
              if (err) {
                throw err;
              } else {
                res.status(200).json(rows);
              }
            });
        }
      });
  } else {
    // Object is not valid
    return res.status(400).json(validate(car, constraints.newCarConst));
  }
});

module.exports = router;
