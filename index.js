const { MongoClient, ObjectId } = require("mongodb");
const connectionString = 'mongodb+srv://Rony:pass123@cluster0.esaam.mongodb.net/TodoApp?retryWrites=true&w=majority'
const express = require('express');
const bodyparser = require("body-parser");
const app = express();
app.set('view engine', 'ejs')
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

const server = app.listen(process.env.PORT || 8000, () => {
  console.log('now listening to port 8000');
})

const getStatus = (task) => {
  return task.isComplete ? 'Complete' : 'In Progress';
}

const whenFirstLoaded = (collection, response) => {
  return collection.find().toArray()
    .then(tasks => {
    response.render('index.ejs', {
      tasks: tasks,
      getStatus: getStatus
    });
    })
    .catch(e => console.error(e));
}

MongoClient.connect(connectionString)
  .then(client => {
    console.log('Connected Successfully!');
    const db = client.db();
    const tasksCollection = db.collection('tasks');
    app.get('/', async (req, res) => {
      return whenFirstLoaded(tasksCollection, res);
    })
    app.get('/task', async (req, res) => {
      whenFirstLoaded(tasksCollection, res);
    })
    app.post('/task', async (req, res) => {
      req.body['isComplete'] = false;
      tasksCollection.insertOne(req.body).then(() => whenFirstLoaded(tasksCollection, res));
    })
    app.delete(`/task/:id`, async (req, res) => {
      const id = ObjectId(req.params.id.trim());
      return await tasksCollection.deleteOne({ _id: id })
        .then(result => {
          if (result.deletedCount === 0) {
            res.send('Task not found')
          } else {
            whenFirstLoaded(tasksCollection, res)
          }
        }).catch(e => console.error(e))
    })
    app.put('/task/toggle/:id', async (req, res) => {
      const id = new ObjectId(req.params.id.trim());
      return tasksCollection.find({ _id: id }).toArray().then(async (tasks) => {
        if (tasks.length > 0) {
          const task = tasks[0];
          return tasksCollection.updateOne({ _id: id }, { '$set': { isComplete: !task.isComplete } })
            .then((result) => {
              return whenFirstLoaded(tasksCollection, res);
            })
        }
      })
    })
  })
