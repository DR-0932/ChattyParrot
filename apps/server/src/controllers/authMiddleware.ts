import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import "dotenv/config"

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

export function authMiddleware(req:Request,res:Response,next:NextFunction):void{
    const token = req.cookies?.token;
    if(!token){
        res.status(401).json({error:"Unauthorized:No token provided"})
        return
    }

    try{
        const decoded =jwt.verify(token,JWT_SECRET) as JwtPayload

        if(typeof decoded.id !=="string"){
            res.status(401).json({error:"invalid token payload"});
            return
        }
        res.locals.userId = decoded.id;

        next();
    }catch(err){
        res.status(401).json({error:"Invalid or expired token"});
    }
}