const { MongoClient } = require("mongodb");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();

// Client
const CLIENT = new MongoClient(process.env.URL);

// DB To use
const DBNAME = process.env.DBNAME;

// Middleware
app.use(express.static("public"));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.status(300).redirect("/index.html");
});

app.get("/queuers", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");
        const queuers = await col.find({}).toArray();

        res.status(200).send(queuers);
    } catch (e) {
        res.status(500).send({
            error: "Could not retrieve all queuers",
            value: e,
        });
    } finally {
        await CLIENT.close();
    }
});

app.post("/queuers/add", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");

        // Validate request body
        if (!req.body.twitch_name) throw new Error("Bad Request. Make sure you have filled in your twitch name.");

        // Check for double queuers
        const checkName = await col.findOne({
            twitch_name: req.body.twitch_name,
        });

        if (checkName) throw new Error(`A person with the name "${req.body.twitch_name}" is already in queue.`);

        // Creating the queuer
        let queuer = {
            twitch_name: req.body.twitch_name,
            gamertag: req.body.gamertag ? req.body.gamertag : req.body.twitch_name,
        };

        // Save and send back success message
        await col.insertOne(queuer);
        res.status(201).json(queuer);
    } catch (e) {
        res.status(500).send({
            error: "Could not add to queue",
            value: e.message,
        });
    } finally {
        await CLIENT.close();
    }
});

app.put("/queuers/edit", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");

        // Validation || Requires
        if (!req.body.twitch_name) {
            throw new Error("You are missing one of the following items in your request body: twitch_name or gamertag");
        }

        query = {
            twitch_name: req.body.twitch_name,
        };

        let queuer = {};
        if (req.body.new_twitch_name && req.body.new_gamertag) {
            queuer = {
                $set: {
                    twitch_name: req.body.new_twitch_name,
                    gamertag: req.body.new_gamertag,
                },
            };
        } else if (req.body.new_twitch_name) {
            queuer = {
                $set: {
                    twitch_name: req.body.new_twitch_name,
                },
            };
        } else if (req.body.new_gamertag) {
            queuer = {
                $set: {
                    gamertag: req.body.new_gamertag,
                },
            };
        }
        const updatedQueuer = await col.updateOne(query, queuer, { upsert: false });

        if (updatedQueuer.matchedCount === 1) {
            res.status(200).send({ message: `Succesfully changed person with twitch name ${req.body.twitch_name}` });
        } else {
            throw new Error(`Could not find person with twitch name ${req.body.twitch_name}`);
        }
    } catch (e) {
        res.status(500).send({
            error: e.name,
            value: e.message,
        });
    } finally {
        await CLIENT.close();
    }
});

app.delete("/queuers/:name", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");
        const deleteQueuer = await col.findOne({ twitch_name: req.query.name });
        const deletedQueuer = await col.deleteOne(deleteQueuer);
        if (deletedQueuer.deletedCount === 1) {
            res.status(200).send({ message: `Person with twitch name ${req.query.name} successfully removed from queue.` });
        } else {
            res.status(404).send({ message: `No person found. Deleted 0 persons` });
        }
    } catch (e) {
        res.status(500).send({
            error: e.name,
            value: e.message,
        });
    } finally {
        await CLIENT.close();
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`);
});
