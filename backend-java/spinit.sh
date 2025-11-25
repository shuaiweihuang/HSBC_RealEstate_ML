curl -G https://start.spring.io/starter.tgz \
  -d dependencies=web,cache,data-redis,lombok \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.4.0 \
  -d javaVersion=21 \
  -d baseDir=. \
  -d name=market-api \
  -d artifactId=market-api \
  -d groupId=com.hsbc \
  -d packageName=com.hsbc.market \
  | tar -xzvf -
