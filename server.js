const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files if you have a public folder
app.use(express.static('public'));

// Secure production credentials check example
// Remove or configure this block if you want to skip strict checks on Render
if (process.env.NODE_ENV === 'production') {
    // If you want to require specific environment variables in production, check them here:
    // if (!process.env.SESSION_SECRET) {
    //     throw new Error("Configure secure production credentials.");
    // }
}

app.get('/', (req, res) => {
    res.send('Loan Application Portal is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
