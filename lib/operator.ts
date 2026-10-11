export type OperatorDetails = {
  name: string;
  address: string;
  email: string;
  configured: boolean;
};

export function operatorDetails(): OperatorDetails {
  const name = process.env.IMPRESSUM_NAME?.trim() ?? "";
  const address = process.env.IMPRESSUM_ADDRESS?.trim() ?? "";
  const email = process.env.IMPRESSUM_EMAIL?.trim() ?? "";
  return {
    name,
    address,
    email,
    configured: Boolean(name && address && email),
  };
}
