import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { login_schema, signup_schema } from "../validation/zod.js";
import {prisma} from "../lib/prisma.js"


const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}

export async function signup(req: Request, res: Response): Promise<void> {
    const parsed = signup_schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "invalid data" });
        return;
    }
    const { username, password, email } = parsed.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                password: hashedPassword,
                name:username,
                email,
            },
        });
        res.status(201).json({message:"Signup Successful"});
    } catch (err:any) {
           console.error("Signup error details:", err); 
            res.status(500).json({ 
            error: err.message || "Internal server error"
            });
        }
}


export async function login(req: Request, res: Response): Promise<void> {
    const parsed = login_schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "invalid data" });
        return;
    }
    const { loginIdentifier, password } = parsed.data;
        try {
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: loginIdentifier },
                        { email: loginIdentifier },
                    ],
                },
            });
            if (!user) {
                res.status(404).json({ error: "user not found" });
                return;
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                res.status(401).json({ error: "Invalid username or password" });
                return;
            }
            const token = jwt.sign(
                { id: user.id, },
                JWT_SECRET,
                { expiresIn: "1d" }
            );
            res.cookie('token',token,{
                httpOnly:true,
                secure:false,
                sameSite:'lax',
            })
            const { password: _, ...safeUser } = user;
            res.status(200).json({ token, userdata: safeUser,message:"Login successful" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "internal server error" });
        }
}


