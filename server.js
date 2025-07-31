import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import cors from "cors"

dotenv.config();

const app = express();

//middleware
app.use(cors());
app.use(express.json());

//Routes
app.get('/',(req,res)=>{
    res.send("AuthKit Api is running")
})

//MongoDB connection
const connection = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected");
    } catch (error){
        console.error('❌ MongoDB connection error: ', error);
    }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>{
    connection();
    console.log(`Server running on port ${PORT}`);
});