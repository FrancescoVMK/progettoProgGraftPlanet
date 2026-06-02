#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <chrono>

#include "GL/glew.h" 
#include "GL/freeglut.h"
#include "glm/glm.hpp"


// This program creates a small GL window with freeglut/glew and renders a
// single fullscreen triangle. The heavy lifting (per-pixel color) is done in
// an external fragment shader (shader.frag) that follows a "shadertoy" style
// API (mainImage, iTime, iResolution).

// Globals for shader rendering
// gProgram: linked GLSL program used for rendering
// gVAO: vertex array object holding the fullscreen triangle
// gWidth/gHeight: current window size (used for iResolution)
// gStartTime: starting time for computing iTime uniform
static GLuint gProgram = 0;
static GLuint gVAO = 0;
static int gWidth = 800, gHeight = 600;
static std::chrono::high_resolution_clock::time_point gStartTime;

// Mouse state (passed to shader as iMouse)
// iMouse.xy = current mouse position in pixels (origin bottom-left)
// iMouse.zw = mouse down position while left button is pressed, else (0,0)
static float gMouseX = 0.0f, gMouseY = 0.0f;
static float gMouseDownX = 0.0f, gMouseDownY = 0.0f;
static bool gMouseIsDown = false;

// Update stored mouse position converting GLUT's top-left origin to
// OpenGL's bottom-left coordinate system used by gl_FragCoord.
static void UpdateMousePos(int x, int y)
{
    gMouseX = (float)x;
    gMouseY = (float)(gHeight - y);
}

// GLUT mouse button callback: record down/up and down position
static void MouseButtonCB(int button, int state, int x, int y)
{
    if (button == GLUT_LEFT_BUTTON)
    {
        if (state == GLUT_DOWN)
        {
            gMouseIsDown = true;
            gMouseDownX = (float)x;
            gMouseDownY = (float)(gHeight - y);
            UpdateMousePos(x, y);
        }
        else // GLUT_UP
        {
            gMouseIsDown = false;
            // On release, reset down position to zero (common shadertoy convention)
            gMouseDownX = 0.0f;
            gMouseDownY = 0.0f;
            UpdateMousePos(x, y);
        }
    }
}

// GLUT motion callbacks: update current mouse position
static void MouseMotionCB(int x, int y) { UpdateMousePos(x, y); }
static void MousePassiveMotionCB(int x, int y) { UpdateMousePos(x, y); }

// Read entire file into a std::string. Used to load shader source files
static std::string LoadFileToString(const std::string &path)
{
    std::ifstream in(path);
    if (!in)
        return std::string();
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

// Compile a GLSL shader from a source string. On failure prints the compiler
// log to stderr and exits. Returns the created shader ID on success.
static GLuint CompileShader(GLenum type, const std::string &src)
{
    const char *csrc = src.c_str();
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &csrc, nullptr);
    glCompileShader(shader);
    GLint ok = GL_FALSE;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &ok);
    if (!ok)
    {
        GLint len = 0;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &len);
        std::string log(len, ' ');
        glGetShaderInfoLog(shader, len, nullptr, &log[0]);
        std::cerr << "Shader compile error: " << log << std::endl;
        exit(1);
    }
    return shader;
}

// Link a vertex and fragment shader into a program. On failure prints the
// linker log and exits. Returns the linked program ID.
static GLuint LinkProgram(GLuint vs, GLuint fs)
{
    GLuint prog = glCreateProgram();
    glAttachShader(prog, vs);
    glAttachShader(prog, fs);
    glLinkProgram(prog);
    GLint ok = GL_FALSE;
    glGetProgramiv(prog, GL_LINK_STATUS, &ok);
    if (!ok)
    {
        GLint len = 0;
        glGetProgramiv(prog, GL_INFO_LOG_LENGTH, &len);
        std::string log(len, ' ');
        glGetProgramInfoLog(prog, len, nullptr, &log[0]);
        std::cerr << "Program link error: " << log << std::endl;
        exit(1);
    }
    return prog;
}

// Render callback called by GLUT each frame. This updates uniforms and draws
// the single fullscreen triangle; the fragment shader computes the pixel
// color for every fragment that covers the viewport.
void RenderSceneCB()
{
    using namespace std::chrono;
    // iTime: elapsed seconds since program start
    float time = duration<float>(high_resolution_clock::now() - gStartTime).count();

    // Ensure viewport matches window size and clear the color buffer
    glViewport(0, 0, gWidth, gHeight);
    glClear(GL_COLOR_BUFFER_BIT);

    glUseProgram(gProgram);

    // Set shadertoy-like uniforms if the shader declares them
    GLint locTime = glGetUniformLocation(gProgram, "iTime");
    if (locTime >= 0) glUniform1f(locTime, time);
    GLint locRes = glGetUniformLocation(gProgram, "iResolution");
    if (locRes >= 0) glUniform2f(locRes, (float)gWidth, (float)gHeight);

    // Pass mouse uniform (iMouse: vec4)
    GLint locMouse = glGetUniformLocation(gProgram, "iMouse");
    if (locMouse >= 0)
    {
        float mdx = gMouseIsDown ? gMouseDownX : 0.0f;
        float mdy = gMouseIsDown ? gMouseDownY : 0.0f;
        glUniform4f(locMouse, gMouseX, gMouseY, mdx, mdy);
    }

    // Draw the triangle (3 vertices). The vertex shader simply passes
    // clip-space positions through; the fragment shader receives gl_FragCoord.
    glBindVertexArray(gVAO);
    glDrawArrays(GL_TRIANGLES, 0, 3);
    glBindVertexArray(0);

    // Present and request next frame
    glutSwapBuffers();
    glutPostRedisplay();
}

// GLUT reshape callback: update stored window size and viewport when the
// user resizes the window so iResolution reflects the current rectangle.
static void ReshapeCB(int w, int h)
{
    if (w <= 0 || h <= 0) return;
    gWidth = w;
    gHeight = h;
    glViewport(0, 0, gWidth, gHeight);
}

// Setup GL, compile shaders, create buffers and register callbacks
void init(int argc, char *argv[])
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGBA);
    glutInitWindowSize(gWidth, gHeight);
    glutInitWindowPosition(100, 100);
    glutCreateWindow("Test Code");

    // Must be done after glut is initialized!
    GLenum res = glewInit();
    if (res != GLEW_OK)
    {
        std::cerr << "Error : " << glewGetErrorString(res) << std::endl;
        exit(1);
    }

    // Create a single "fullscreen" triangle that covers the entire NDC
    // (this is an efficient way to render a full-screen quad while avoiding
    // interpolation artifacts along shared edges).
    GLfloat vertices[] = {
        -1.0f, -1.0f,
         3.0f, -1.0f,
        -1.0f,  3.0f
    };
    GLuint vbo = 0;
    glGenVertexArrays(1, &gVAO);
    glGenBuffers(1, &vbo);
    glBindVertexArray(gVAO);
    glBindBuffer(GL_ARRAY_BUFFER, vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, (void*)0);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    glBindVertexArray(0);

    // Load vertex and fragment shader sources from disk. This keeps GLSL
    // files editable without recompiling the C++ program.
    std::string vsSrc = LoadFileToString("shader.vert");
    if (vsSrc.empty())
    {
        std::cerr << "Failed to load shader.vert - make sure it exists in the executable directory." << std::endl;
        exit(1);
    }

    std::string fsSrc = LoadFileToString("shader.frag");
    if (fsSrc.empty())
    {
        std::cerr << "Failed to load shader.frag - make sure it exists in the executable directory." << std::endl;
        exit(1);
    }

    // Compile and link shaders into gProgram
    GLuint vs = CompileShader(GL_VERTEX_SHADER, vsSrc);
    GLuint fs = CompileShader(GL_FRAGMENT_SHADER, fsSrc);
    gProgram = LinkProgram(vs, fs);
    glDeleteShader(vs);
    glDeleteShader(fs);

    // Register input callbacks so we can update iMouse
    glutMouseFunc(MouseButtonCB);
    glutMotionFunc(MouseMotionCB);
    glutPassiveMotionFunc(MousePassiveMotionCB);
    // Register reshape callback so the viewport and iResolution follow window size
    glutReshapeFunc(ReshapeCB);

    // Register the render callback
    glutDisplayFunc(RenderSceneCB);

    // store start time used to compute iTime
    gStartTime = std::chrono::high_resolution_clock::now();

    // set initial clear color in case the shader doesn't write to every pixel
    glClearColor(0, 0, 0, 1);
}

// Program entry point: initialize and enter GLUT main loop
int main(int argc, char *argv[])
{
    init(argc, argv);

    glutMainLoop();

    return 0;
}