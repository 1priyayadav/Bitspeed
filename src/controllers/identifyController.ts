import { Request, Response } from 'express';
import { reconcileIdentity } from '../services/identityService';

export const identifyContact = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, phoneNumber } = req.body;

        const normalizedEmail = email ? String(email).trim() : null;
        const normalizedPhone = phoneNumber ? String(phoneNumber).trim() : null;

        if (!normalizedEmail && !normalizedPhone) {
            res.status(400).json({ error: 'Either email or phoneNumber must be provided' });
            return;
        }

        const result = await reconcileIdentity({ email: normalizedEmail, phoneNumber: normalizedPhone });
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in identifyContact:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
