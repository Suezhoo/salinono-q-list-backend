const { MongoClient } = require("mongodb");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const cookie = require("cookie");
const http = require("http");
require("dotenv").config();

// Client
const CLIENT = new MongoClient(process.env.FINAL_URL);

// DB To use
const DBNAME = process.env.DBNAME;

// Middleware
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(cors());

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
            error: e.message,
            value: e.value,
        });
    } finally {
        await CLIENT.close();
    }
});

app.get("/join", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");

        const name = req.query.name;

        // Check for double queuers
        const checkDouble = await col.findOne({ name });
        if (checkDouble) {
            res.status(200).send(`${name}, you are already in queue`).end();
        } else {
            // Creating the queuer
            let queuer = { name };

            // Save and send back success message
            await col.insertOne(queuer);

            res.status(200).send(`${name} added to the queue`);
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

// Remove someone from queue (sali only)
app.delete("/remove", async (req, res) => {
    try {
        await CLIENT.connect();

        const name = req.query.name;

        const col = CLIENT.db(DBNAME).collection("queuers");
        const deleteQueuer = await col.findOne({ name });
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
