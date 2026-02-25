import React from "react";
import Layout from "./Layout/Layout";
import Stats from "./Dashboard/Stats";
import ReserveComponsation from "./Dashboard/ReserveComponsation";
const Dashboard = () => {

  return (
    <Layout
      title="Dashboard"
      description="Global Financial Platform Overview"
      ButtonComponent={<></>}
    >
      <Stats />
      <ReserveComponsation />
    </Layout>
  );
};

export default Dashboard;
