import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { verifyIncomeStatement } from "../services/income-service";

export const incomeStatementsRouter = Router();

const readParam = (value: string | string[]) => (Array.isArray(value) ? value[0] : value);

incomeStatementsRouter.get(
  "/verify/:verifyToken",
  asyncHandler(async (request, response) => {
    const statement = await verifyIncomeStatement(readParam(request.params.verifyToken));

    response.json({
      data: {
        statement
      }
    });
  })
);
