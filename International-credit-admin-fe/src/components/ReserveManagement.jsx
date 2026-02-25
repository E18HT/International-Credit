import React from "react";
import Layout from "./Layout/Layout";
import ReserveCards from "./ReserveManagement/ReserveCards";

const ReserveManagement = () => {

  return (
    <Layout
      title="Reserve Management"
      description="Manage the reserve of the financial platform"
      ButtonComponent={<></>}
    >
      <ReserveCards />
    </Layout>
  );
};

export default ReserveManagement;
