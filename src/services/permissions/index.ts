import prisma from "../../lib/prisma.js"

const getPermissions = async () => {
    let permissions = await prisma.groupPermission.findMany({
        where: {
            groupId: 2
        },
        include: {
            permission: true
        }
    })
    let obj = permissions.map(permission => permission.permission)
    return obj
}

export default {
    getPermissions,
}
