import type { Request, Response } from "express";
import * as testCaseService from "../services/testcase.service.js";

export async function list(req: Request, res: Response) {
  const testCases = await testCaseService.listTestCasesForAdmin(req.params.problemId!);
  res.json({ testCases });
}

export async function create(req: Request, res: Response) {
  const testCase = await testCaseService.createTestCase(req.params.problemId!, req.body);
  res.status(201).json({ testCase });
}

export async function update(req: Request, res: Response) {
  const testCase = await testCaseService.updateTestCase(
    req.params.problemId!,
    req.params.testCaseId!,
    req.body,
  );
  res.json({ testCase });
}

export async function remove(req: Request, res: Response) {
  await testCaseService.deleteTestCase(req.params.problemId!, req.params.testCaseId!);
  res.status(204).send();
}
