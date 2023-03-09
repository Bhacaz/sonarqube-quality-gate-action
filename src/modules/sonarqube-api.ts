import axios from "axios";
import { QualityGate } from "./models";

export const fetchQualityGate = async (
  url: string,
  projectKey: string,
  token: string,
  pullRequest: number
): Promise<QualityGate> => {
  const response = await axios.get<QualityGate>(
    `${url}/api/qualitygates/project_status`,
    {
      params: {
        projectKey,
        pullRequest
      },
      auth: {
        username: token,
        password: "",
      },
    }
  );

  return response.data;
};
