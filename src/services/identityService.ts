import { prisma } from '../config/database';

interface IdentityRequest {
    email?: string | null;
    phoneNumber?: string | null;
}

export const reconcileIdentity = async (data: IdentityRequest) => {
    const { email, phoneNumber } = data;

    if (!email && !phoneNumber) {
        throw new Error('Either email or phoneNumber must be provided');
    }

    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });

    // 1. Find directly matching contacts
    const directMatches = await prisma.contact.findMany({
        where: { OR: orConditions },
    });

    // 2. If no matches, create a new primary contact
    if (directMatches.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkPrecedence: 'primary',
            },
        });

        return {
            contact: {
                primaryContatctId: newContact.id,
                emails: newContact.email ? [newContact.email] : [],
                phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
                secondaryContactIds: [],
            },
        };
    }

    // 3. Collect all linked contacts in these clusters
    const primaryIds = new Set<number>();
    for (const contact of directMatches) {
        if (contact.linkedId) {
            primaryIds.add(contact.linkedId);
        } else {
            primaryIds.add(contact.id);
        }
    }

    const allLinkedContacts = await prisma.contact.findMany({
        where: {
            OR: [
                { id: { in: Array.from(primaryIds) } },
                { linkedId: { in: Array.from(primaryIds) } },
            ],
        },
        orderBy: { createdAt: 'asc' },
    });

    // 4. Identify the oldest primary contact
    const primaries = allLinkedContacts.filter(
        (c: any) => c.linkPrecedence === 'primary'
    );
    primaries.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

    const oldestPrimary = primaries[0];

    // 5. If there are other primary contacts, update them to secondary
    const newerPrimaries = primaries.slice(1);
    if (newerPrimaries.length > 0) {
        const newerPrimaryIds = newerPrimaries.map((c: any) => c.id);

        // Update the newer primaries
        await prisma.contact.updateMany({
            where: { id: { in: newerPrimaryIds } },
            data: { linkPrecedence: 'secondary', linkedId: oldestPrimary.id },
        });

        // Update their secondary contacts to point to the oldest primary
        await prisma.contact.updateMany({
            where: { linkedId: { in: newerPrimaryIds } },
            data: { linkedId: oldestPrimary.id },
        });

        // reflect updates in our loaded array
        for (const contact of allLinkedContacts) {
            if (newerPrimaryIds.includes(contact.id)) {
                (contact as any).linkPrecedence = 'secondary';
                contact.linkedId = oldestPrimary.id;
            }
            if (contact.linkedId && newerPrimaryIds.includes(contact.linkedId)) {
                contact.linkedId = oldestPrimary.id;
            }
        }
    }

    // 6. Check if we need to add new information as a secondary contact
    const isNewEmail = email && !allLinkedContacts.some((c: any) => c.email === email);
    const isNewPhone =
        phoneNumber && !allLinkedContacts.some((c: any) => c.phoneNumber === phoneNumber);

    if (isNewEmail || isNewPhone) {
        const newContact = await prisma.contact.create({
            data: {
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkPrecedence: 'secondary',
                linkedId: oldestPrimary.id,
            },
        });
        allLinkedContacts.push(newContact);
    }

    // 7. Assemble the response
    const emailsSet = new Set<string>();
    const phonesSet = new Set<string>();
    const secondaryContactIds: number[] = [];

    // ensure primary contact info is first
    if (oldestPrimary.email) emailsSet.add(oldestPrimary.email);
    if (oldestPrimary.phoneNumber) phonesSet.add(oldestPrimary.phoneNumber);

    for (const contact of allLinkedContacts) {
        if (contact.email) emailsSet.add(contact.email);
        if (contact.phoneNumber) phonesSet.add(contact.phoneNumber);
        if (contact.id !== oldestPrimary.id) {
            // avoid duplicates in secondary ids in case memory array has anomalies
            if (!secondaryContactIds.includes(contact.id)) {
                secondaryContactIds.push(contact.id);
            }
        }
    }

    return {
        contact: {
            primaryContatctId: oldestPrimary.id,
            emails: Array.from(emailsSet),
            phoneNumbers: Array.from(phonesSet),
            secondaryContactIds,
        },
    };
};
