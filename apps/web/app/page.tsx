import Dashboard from "../components/Dashboard";
import seedData from "../data/seed-data.json";
import type { SeedData } from "../lib/types";

export default function Page() {
  return <Dashboard seedData={seedData as SeedData} />;
}
