const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yzhdch4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    /* ######################## MongoDB CRUD ######################## */

    /* Collection */

    const usersCollection = client.db("recipeDB").collection("users");
    const recipesCollection = client.db("recipeDB").collection("recipes");

    /* POST */

    // user
    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;

        // Check if user exists
        const existingUser = await usersCollection.findOne({
          email: userData.email,
        });

        if (existingUser) {
          // Update last sign-in time for existing users
          await usersCollection.updateOne(
            { _id: existingUser._id },
            { $set: { lastSignInTime: userData.lastSignInTime } }
          );
          return res.send({ message: "User exists", _id: existingUser._id });
        }

        // Insert new user
        const result = await usersCollection.insertOne(userData);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // recipe
    app.post("/recipes", async (req, res) => {
      const recipe = req.body;
      console.log("Received recipe:", recipe);
      const result = await recipesCollection.insertOne(recipe);
      res.status(200).send(result);
    });

    /* GET */

    // user
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // getting through email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // recipe
    app.get("/recipes", async (req, res) => {
      const result = await recipesCollection.find().toArray();
      res.send(result);
    });

    app.get("/recipes/top", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 6;
        const result = await recipesCollection
          .find()
          .sort({ likeCount: -1 })
          .limit(limit)
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // getting through id
    app.get("/recipes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await recipesCollection.findOne(query);
      res.send(result);
    });

    app.get("/my-recipes/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const recipes = await recipesCollection
          .find({ authorId: userId })
          .toArray();
        res.send(recipes);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    /* PUT */

    // PUT - Update like count
    app.put("/recipes/:id/like", async (req, res) => {
      try {
        const { id } = req.params;
        const { userId } = req.body;

        // 1. Get the recipe to check author
        const recipe = await recipesCollection.findOne({
          _id: new ObjectId(id),
        });

        // 2. Check if user is trying to like their own recipe
        if (recipe.authorId === userId) {
          return res
            .status(400)
            .send({ error: "You can't like your own recipe" });
        }

        // 3. Increment like count
        const result = await recipesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { likeCount: 1 } }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    app.put("/recipes/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedRecipe = req.body;

        console.log("Updating Recipe ID:", id);
        console.log("Updated Data:", updatedRecipe);

        const result = await recipesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedRecipe }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    /* DELETE */

    // recipe
    app.delete("/recipes/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await recipesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    /* ######################## Ping MongoDB ######################## */
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Recipe app server");
});

app.listen(port, () => {
  console.log(`Recipe app listening on port ${port}`);
});
