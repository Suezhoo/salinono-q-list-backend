const { MongoClient } = require("mongodb");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const cookie = require("cookie");
const http = require("http");
const e = require("express");
const { response } = require("express");
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

// Queue status
let queue_isOpen = false;

// Get everyone in queue for twitch (text)
app.get("/queuers/twitch", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");
        const queuers = await col.find({}).toArray();

        if (queuers.length != 0) {
            let string = "";
            queuers.forEach((e) => {
                string += `${e.name}, `;
            });

            res.status(200).send(string.slice(0, -2));
        } else {
            res.status(200).send("There is currently no one in queue.");
        }
    } catch (e) {
        res.status(500).send({
            error: e.message,
            value: e.value,
        });
    } finally {
        await CLIENT.close();
    }
});

// Get everyone in queue (array)
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

// Join queue
app.get("/join", async (req, res) => {
    try {
        const name = req.query.name;

        // Check queue status -> closed = abort
        if (!queue_isOpen) {
            res.status(200).send(`${name}, queue is currently closed.`);
            return;
        }

        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");

        // Check for double queuers
        const checkDouble = await col.findOne({ name });
        if (checkDouble) {
            res.status(200).send(`${name}, you are already in queue.`).end();
        } else {
            // Creating the queuer
            let queuer = { name };

            // Save and send back success message
            await col.insertOne(queuer);

            res.status(200).send(`${name} joined the queue.`);
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

// Remove from queue
app.get("/remove", async (req, res) => {
    try {
        await CLIENT.connect();

        const name = req.query.name;

        const col = CLIENT.db(DBNAME).collection("queuers");
        const deleteQueuer = await col.findOne({ name });
        if (deleteQueuer) {
            const deletedQueuer = await col.deleteOne(deleteQueuer);
            if (deletedQueuer.deletedCount === 1) {
                res.status(200).send(`${name} left the queue.`);
            }
        } else {
            res.status(200).send(`${name}, you're not in queue, type !join to join the queue.`);
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

// Clear queue
app.get("/clear", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");
        const deleted = await col.deleteMany({});
        res.status(200).send("Queue cleared.");
    } catch (e) {
        res.status(500).send({
            error: e.name,
            value: e.message,
        });
    } finally {
        await CLIENT.close();
    }
});

// Open queue
app.get("/open", async (req, res) => {
    queue_isOpen = true;
    res.status(200).send("Queue is open.");
});

// Close queue
app.get("/close", async (req, res) => {
    queue_isOpen = false;
    res.status(200).send("Queue is closed.");
});

// Get queue status
app.get("/queue/status", async (req, res) => {
    res.status(200).send(queue_isOpen);
});

// Next turn -> get rid of the 1st and 2nd in queue
app.get("/queue/next-turn", async (req, res) => {
    try {
        await CLIENT.connect();
        const col = CLIENT.db(DBNAME).collection("queuers");
        // Get first 2 queuers
        const limit = 2;
        const queuers = await col.find({}).limit(limit).toArray();
        // Delete queuers
        let responseString = "";
        for (let i = 0; i < limit; i++) {
            await col.deleteOne(queuers[i]);
            responseString += `"${queuers[i].name}", `;
        }
        res.status(200).send(`Removed people with twitch names: ${responseString}from queue.`);
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
