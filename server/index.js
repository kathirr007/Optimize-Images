import express from 'express'
import childProcess from 'child_process'
const app = express();
const port = 3010;

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.get('/optimize-images', (req, res) => {
    childProcess.exec('npm run optimize:images', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error optimizing images: ${error}`);
        res.status(500).send('Error optimizing images.');
      } else {
        console.log(`Images optimized successfully: ${stdout}`);
        res.send('Images optimized successfully.');
      }
    });
  });

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});