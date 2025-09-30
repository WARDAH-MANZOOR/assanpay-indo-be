import { Request, Response } from "express"
import { JwtPayload } from "jsonwebtoken"
import { permissionService } from "../../services/index.js"
import ApiResponse from "../../utils/ApiResponse.js"

const getPermissions = async (req: Request, res: Response) => {
    const merchant_id = (req.user as JwtPayload)?.merchant_id as string
    if(!merchant_id) {
        res.status(401).json(ApiResponse.error('Unauthorized',401))
        return
    }
    const permissions = await permissionService.getPermissions()
    res.status(200).json(ApiResponse.success(permissions))
}

export default {
    getPermissions,
}
