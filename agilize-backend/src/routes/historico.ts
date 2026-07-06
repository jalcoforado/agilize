import express, { Request, Response } from 'express';
import { autenticar } from '../middleware/auth';

const router = express.Router();

router.use(autenticar);

router.get('/:idDemanda', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Endpoint de histórico',
  });
});

export default router;
