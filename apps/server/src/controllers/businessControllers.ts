import type { Request, Response } from "express";
import {prisma} from "../lib/prisma.js"


export async function conversationList(req: Request, res: Response) {
    const userId = res.locals.userId;

    try{
        const conversations = await prisma.conversation.findMany({
            where:{ userId},
            orderBy:{ createdAt:"desc"}
        })
        res.status(200).json(conversations);
    }catch(error){
        res.status(500).json({error:"Internal Server Error"})
    }
}

export async function getMessages(req:Request, res:Response) {
    const conversationId = req.params.conversationId as string;
    const userId = res.locals.userId;

    try{
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                userId,
            },
        });
        
        if (!conversation) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }
        
        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: "desc" },
        });
        
        res.status(200).json(messages);

    }catch(err){
        res.status(500).json({error:"Internal server error"})
        console.log("Error:",err)
    }

}

export async function getOrCreateConversation(userId: string,conversationId: string | undefined,firstMessage: string){
    if(conversationId){
        return prisma.conversation.findFirst({
            where:{id:conversationId,userId},
            select:{id:true}
        });
    }
    return prisma.conversation.create({
        data:{ userId, title:firstMessage.slice(0,50) },
        select:{id:true},
    });
}

export async function getHistory(conversationId:string,limit= 20){
    const rows = await prisma.message.findMany({
        where:{conversationId},
        orderBy:{createdAt:"desc"},
        take:limit,
        select:{role:true,content:true}
    });
    return rows.reverse();
}

export async function saveMessage( conversationId:string, role:"user" | "assistant", content:string){
    return prisma.message.create({
        data:{conversationId, role , content},
    });
}