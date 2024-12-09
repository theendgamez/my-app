import AWS from "aws-sdk";
import bcrypt from "bcrypt";
import { NextApiRequest, NextApiResponse } from "next";

const dynamoDB = new AWS.DynamoDB.DocumentClient();
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
    if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

    const { email, password, phoneNumber } = req.body;

    try {
        // 密碼加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 保存到 DynamoDB
        const params = {
            TableName: "Users",
            Item: {
                userId: `user_${Date.now()}`, // 生成唯一用戶 ID
                email,
                phoneNumber,
                isPhoneVerified: false, // 初始為未驗證
                passwordHash: hashedPassword,
                activities: [],
            },
        };

        await dynamoDB.put(params).promise();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
}