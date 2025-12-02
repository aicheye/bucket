/**
 * Shared item form modal for adding/editing items
 * Used in both dashboard and grades pages
 */

import type { Course, Item, ItemFormData } from "../../../lib/types";
import Modal from "../ui/Modal";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem: Item | null;
  addingItemCourseId: string | null;
  itemData: ItemFormData;
  setItemData: (data: ItemFormData) => void;
  courses: Course[];
  getCourseTypes: (courseId: string) => string[];
}

export default function ItemFormModal({
  isOpen,
  onClose,
  onSave,
  editingItem,
  addingItemCourseId,
  itemData,
  setItemData,
  courses,
  getCourseTypes,
}: ItemFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? "Edit Item" : "Add Item"}
      onConfirm={onSave}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {editingItem === null &&
          addingItemCourseId === null &&
          courses.length > 0 && (
            <div className="form-control w-full">
              <label className="label mb-2">
                <span className="label-text">Course</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={itemData.course_id || ""}
                onChange={(e) => {
                  const newCourseId = e.target.value;
                  const types = getCourseTypes(newCourseId);
                  setItemData({
                    ...itemData,
                    course_id: newCourseId,
                    type: types[0] || "Assignment",
                  });
                }}
              >
                <option disabled value="">
                  Select a course
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          )}
        <div className="form-control w-full">
          <label className="label mb-2">
            <span className="label-text">Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={itemData.name}
            onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
          />
        </div>
        <div className="form-control w-full">
          <label className="label mb-2 flex items-center gap-2">
            <span className="label-text">Type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={itemData.type}
            onChange={(e) => setItemData({ ...itemData, type: e.target.value })}
          >
            {(addingItemCourseId || itemData.course_id) &&
              getCourseTypes(
                addingItemCourseId || itemData.course_id || "",
              ).map((t: string) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-control w-full">
            <label className="label mb-2">
              <span className="label-text">Grade</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={itemData.grade}
              onChange={(e) =>
                setItemData({ ...itemData, grade: e.target.value })
              }
            />
          </div>
          <div className="form-control w-full">
            <label className="label mb-2">
              <span className="label-text">Max Grade</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={itemData.max_grade}
              onChange={(e) =>
                setItemData({ ...itemData, max_grade: e.target.value })
              }
            />
          </div>
        </div>
        <div className="form-control w-full">
          <label className="label mb-2">
            <span className="label-text">Due Date</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={itemData.due_date?.split("T")[0] ?? ""}
            onChange={(e) =>
              setItemData({ ...itemData, due_date: e.target.value })
            }
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * Test skeleton for ItemFormModal
 *
 * @jest-environment jsdom
 */
// describe("ItemFormModal", () => {
//   it("should show 'Add Item' title when adding", () => {
//     // TODO: Implement test
//   });
//
//   it("should show 'Edit Item' title when editing", () => {
//     // TODO: Implement test
//   });
//
//   it("should show course selector when no course preselected", () => {
//     // TODO: Implement test
//   });
//
//   it("should populate fields when editing", () => {
//     // TODO: Implement test
//   });
//
//   it("should call onSave when save button clicked", () => {
//     // TODO: Implement test
//   });
//
//   it("should call onClose when cancel button clicked", () => {
//     // TODO: Implement test
//   });
// });
