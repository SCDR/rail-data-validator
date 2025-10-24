buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.5.1")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
// 在适当的位置添加
tasks.withType<Exec> {
  environment("PATH", System.getenv("PATH"))
}

tasks.register("clean").configure {
    delete("build")
}

