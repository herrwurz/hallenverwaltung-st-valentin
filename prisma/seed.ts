async function main() {
  console.log("No seed data configured for phase 1.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
