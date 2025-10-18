import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config';
import { middleware } from "./middleware";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import bcrypt from "bcrypt"

const app = express();
app.use(express.json());
app.post("/signup", async (req, res) => {
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success){
        console.log(parsedData.error);
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }
    //db call
    try{
        const user = await prismaClient.user.create({
        data: {
            email: parsedData.data?.username,
            //Added hashing to secure our signup process
            password: await bcrypt.hash(parsedData.data.password, 10),
            name: parsedData.data.name
        } 
    })
    res.json({
        userId: user.id
    })
    } catch (e) {
        res.status(411).json({
            message: "User already exists with this username" 
        })
    }
})

app.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success){
        res.json({
            message: "Incorrect inputs"
        })
        return;
    } 

    const user = await prismaClient.user.findUnique({
        where: {
            email: parsedData.data.username
        }
    });
    if (!user){
        res.status(403).json({
            message: "Not Authorized"
        })
        return;
    }
    //Code for comparing the hashes that we generated in the signup process
    const isValidPassword = await bcrypt.compare(parsedData.data.password, user.password);
    if(!isValidPassword){
        res.status(403).json({message: "Not Authorized"});
        return;
    }

    const token = jwt.sign({
        userId: user?.id
    }, JWT_SECRET)
    res.json({
        token
    })
})

app.post("/room", middleware, async (req, res) => {

    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success){
        res.json({
            message: "Incorrect inputs"
        })
        return;
    }

    //db call
        //@ts-ignore
        try{
            //@ts-ignore
            const userId = req.userId;

        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name,
                adminId: userId
            }
        })
    res.json({
        roomId: room.id
    })
} catch(e) {
    res.status(411).json({
        message: "Room already exists with this name "
    })
}
})

app.listen(3001);
